import { backendUrl } from "@/constants";

export interface CatalogNft {
  id: number;
  title: string;
  description: string;
  price: string;
  creatorAddress: string;
}

export interface ProtectedNft {
  id: number;
  title: string;
  description: string;
  contentUrl: string;
  price: string;
  creatorAddress: string;
}

export interface PaymentSessionResponse {
  success: boolean;
  hasAccess: boolean;
  message?: string;
  nft?: {
    id: number;
    title: string;
    description: string;
    price: string;
    creatorAddress: string;
  };
  session?: {
    sessionId: string;
    issuedAt: string;
    expiresAt: string;
    network: string;
    chainId: number;
    resource: string;
    paymentRequired: unknown;
    paymentInstructions: {
      to: `0x${string}`;
      valueWei: string;
      rpcUrl: string;
      explorerUrl: string;
    };
  };
}

const getBackendUrl = () => {
  if (!backendUrl) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured.");
  }

  return backendUrl.replace(/\/$/, "");
};

const backendFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `Backend request failed with status ${response.status}.`,
    );
  }

  return data as T;
};

export const fetchCatalog = async (): Promise<CatalogNft[]> => {
  const response = await backendFetch<{ success: boolean; nfts: CatalogNft[] }>(
    "/api/nfts",
  );

  return response.nfts;
};

export const createPaymentSession = (payload: {
  nftId: number;
  walletAddress?: string;
}) =>
  backendFetch<PaymentSessionResponse>("/api/payments/session", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const verifyPayment = (payload: {
  walletAddress: string;
  nftId: number;
  txHash: string;
}) =>
  backendFetch("/api/payments/verify-payment", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const hasAccess = async (
  nftId: number,
  walletAddress: string,
): Promise<boolean> => {
  const response = await backendFetch<{ success: boolean; hasAccess: boolean }>(
    `/api/nfts/has-access/${nftId}?wallet=${walletAddress}`,
  );

  return response.hasAccess;
};

export const fetchProtectedNft = async (
  nftId: number,
  walletAddress: string,
): Promise<ProtectedNft> => {
  const response = await backendFetch<{ success: boolean; nft: ProtectedNft }>(
    `/api/nfts/${nftId}?walletAddress=${walletAddress}`,
  );

  return response.nft;
};

export const createNftListing = (payload: {
  tokenId: number;
  title: string;
  description: string;
  contentUrl: string;
  priceWei: string;
  creatorAddress: string;
  }) =>
  backendFetch("/api/nfts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const registerMintedNft = (payload: {
  txHash: string;
  title: string;
  description: string;
  contentUrl: string;
  priceWei: string;
  creatorAddress: string;
}) =>
  backendFetch("/api/nfts/register-mint", {
    method: "POST",
    body: JSON.stringify(payload),
  });

