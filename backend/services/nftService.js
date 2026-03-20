import { executeQuery, query, withTransaction } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";

const NFT_SELECT = `
  SELECT
    id,
    title,
    description,
    content_url,
    price,
    creator_address
  FROM nfts
  WHERE id = $1
`;

const normalizeWeiPrice = (price, nftId) => {
  const value = String(price ?? "").trim();

  if (!/^\d+$/.test(value)) {
    throw new HttpError(
      500,
      `NFT ${nftId} has an invalid price in the database. Prices must be stored as whole-number wei strings.`,
      {
        code: "INVALID_NFT_PRICE_DATA",
        details: {
          nftId,
          storedPrice: value,
        },
      },
    );
  }

  return value;
};

const normalizeNftRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    ...row,
    price: normalizeWeiPrice(row.price, row.id),
  };
};

const getNftById = async (nftId) => {
  const result = await query(NFT_SELECT, [nftId]);
  return normalizeNftRow(result.rows[0] || null);
};

const getPublicNftCatalog = async () => {
  const result = await query(
    `
      SELECT
        id,
        title,
        description,
        price,
        creator_address
      FROM nfts
      ORDER BY id ASC
    `,
  );

  return result.rows.map((row) => {
    const normalizedRow = normalizeNftRow(row);

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      price: normalizedRow.price,
      creatorAddress: row.creator_address,
    };
  });
};

const getProtectedNftById = async (nftId) => {
  const nft = await getNftById(nftId);

  if (!nft) {
    throw new HttpError(404, "NFT not found.", { code: "NFT_NOT_FOUND" });
  }

  return {
    id: nft.id,
    title: nft.title,
    description: nft.description,
    contentUrl: nft.content_url,
    price: nft.price,
    creatorAddress: nft.creator_address,
  };
};

const getAccessRecord = async (walletAddress, nftId) => {
  const result = await query(
    `
      SELECT
        a.id,
        a.user_id,
        a.nft_id,
        a.granted
      FROM access a
      INNER JOIN users u ON u.id = a.user_id
      WHERE u.wallet_address = $1
        AND a.nft_id = $2
      LIMIT 1
    `,
    [walletAddress, nftId],
  );

  return result.rows[0] || null;
};

const userHasAccessToNft = async (walletAddress, nftId) => {
  if (!walletAddress) {
    return false;
  }

  const accessRecord = await getAccessRecord(walletAddress, nftId);
  return Boolean(accessRecord?.granted);
};

const ensureUser = async (client, walletAddress) => {
  const result = await executeQuery(
    client,
    `
      INSERT INTO users (wallet_address)
      VALUES ($1)
      ON CONFLICT (wallet_address)
      DO UPDATE SET wallet_address = EXCLUDED.wallet_address
      RETURNING id, wallet_address
    `,
    [walletAddress],
  );

  return result.rows[0];
};

const createNftListing = async ({
  tokenId,
  title,
  description,
  contentUrl,
  price,
  creatorAddress,
}) => {
  try {
    const result = await query(
      `
        INSERT INTO nfts (id, title, description, content_url, price, creator_address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, description, content_url, price, creator_address
      `,
      [tokenId, title, description, contentUrl, price, creatorAddress],
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw new HttpError(409, "An NFT listing already exists for this token ID.", {
        code: "NFT_LISTING_ALREADY_EXISTS",
      });
    }

    throw error;
  }
};

const recordSuccessfulPayment = async ({
  walletAddress,
  nftId,
  txHash,
  amount,
  status,
}) =>
  withTransaction(async (client) => {
    try {
      // Persist the payment and the access grant atomically so a partial write
      // never leaves the database in an inconsistent state.
      const nftResult = await executeQuery(client, NFT_SELECT, [nftId]);
      const nft = normalizeNftRow(nftResult.rows[0]);

      if (!nft) {
        throw new HttpError(404, "NFT not found.", { code: "NFT_NOT_FOUND" });
      }

      const existingPayment = await executeQuery(
        client,
        `
          SELECT id
          FROM payments
          WHERE tx_hash = $1
          LIMIT 1
        `,
        [txHash],
      );

      if (existingPayment.rows.length > 0) {
        throw new HttpError(
          409,
          "This transaction hash has already been used.",
          {
            code: "TX_HASH_ALREADY_USED",
          },
        );
      }

      const user = await ensureUser(client, walletAddress);

      const paymentResult = await executeQuery(
        client,
        `
          INSERT INTO payments (user_id, nft_id, tx_hash, amount, status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, user_id, nft_id, tx_hash, amount, status, created_at
        `,
        [user.id, nftId, txHash, amount, status],
      );

      const accessResult = await executeQuery(
        client,
        `
          INSERT INTO access (user_id, nft_id, granted)
          VALUES ($1, $2, TRUE)
          ON CONFLICT (user_id, nft_id)
          DO UPDATE SET granted = EXCLUDED.granted
          RETURNING id, user_id, nft_id, granted
        `,
        [user.id, nftId],
      );

      return {
        nft,
        user,
        payment: paymentResult.rows[0],
        access: accessResult.rows[0],
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new HttpError(
          409,
          "This transaction hash has already been used.",
          {
            code: "TX_HASH_ALREADY_USED",
          },
        );
      }

      throw error;
    }
  });

export {
  createNftListing,
  getAccessRecord,
  getNftById,
  getPublicNftCatalog,
  getProtectedNftById,
  recordSuccessfulPayment,
  userHasAccessToNft,
};
