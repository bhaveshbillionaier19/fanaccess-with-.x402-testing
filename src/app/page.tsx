"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { contractAddress, contractAbi } from "@/constants";
import { type Abi } from "viem";
import NFTCard from "@/components/NFTCard";
import SkeletonCard from "@/components/SkeletonCard";
import Hero from "@/components/Hero";
import StatsCard from "@/components/StatsCard";
import Link from "next/link";
import { motion } from "framer-motion";
import { Layers, LockKeyhole, ShieldCheck, ArrowRight } from "lucide-react";
import { CatalogNft, fetchCatalog } from "@/lib/backend";

export interface NftData {
  tokenId: number;
  metadata: any;
  owner: string;
  listing: CatalogNft | null;
}

export default function Home() {
  const { address } = useAccount();
  const [nfts, setNfts] = useState<NftData[]>([]);
  const [catalog, setCatalog] = useState<Record<number, CatalogNft>>({});
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);

  const { data: totalSupply, isLoading: isLoadingTotalSupply } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "totalSupply",
    query: {
      enabled: Boolean(contractAddress),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: 15000,
      refetchOnMount: "always",
    },
  });

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      try {
        const backendNfts = await fetchCatalog();

        if (!isMounted) {
          return;
        }

        setCatalog(
          backendNfts.reduce<Record<number, CatalogNft>>((accumulator, nft) => {
            accumulator[Number(nft.id)] = nft;
            return accumulator;
          }, {}),
        );
      } catch (error) {
        console.error("Failed to load backend NFT catalog:", error);
      } finally {
        if (isMounted) {
          setIsCatalogLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const nftIds = useMemo(
    () => Array.from({ length: Number(totalSupply || 0) }, (_, i) => i + 1),
    [totalSupply],
  );

  const { data: nftData, isLoading: isLoadingNftData } = useReadContracts({
    contracts: nftIds.flatMap((id) => [
      {
        address: contractAddress,
        abi: contractAbi as Abi,
        functionName: "tokenURI",
        args: [BigInt(id)],
      },
      {
        address: contractAddress,
        abi: contractAbi as Abi,
        functionName: "ownerOf",
        args: [BigInt(id)],
      },
    ]),
    query: {
      enabled: Boolean(contractAddress) && nftIds.length > 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: 15000,
      refetchOnMount: "always",
    },
  });

  useEffect(() => {
    if (!nftData) {
      return;
    }

    const fetchAllMetadata = async () => {
      const formattedNfts = await Promise.all(
        nftIds.map(async (id, index) => {
          const tokenURI = nftData[index * 2]?.result as string;
          const owner = nftData[index * 2 + 1]?.result as string;

          let metadata: Record<string, unknown> = {};
          try {
            const response = await fetch(tokenURI);
            metadata = await response.json();
          } catch (error) {
            console.error(`Failed to fetch metadata for token ${id}:`, error);
          }

          const listing = catalog[id] ?? null;

          return {
            tokenId: id,
            metadata: {
              ...metadata,
              name: (metadata as any)?.name || listing?.title || `NFT #${id}`,
              description: (metadata as any)?.description || listing?.description || "Creator NFT",
            },
            owner,
            listing,
          } satisfies NftData;
        }),
      );

      setNfts(formattedNfts);
    };

    void fetchAllMetadata();
  }, [catalog, nftData, nftIds]);

  const listedCount = useMemo(
    () => nfts.filter((nft) => nft.listing).length,
    [nfts],
  );

  const isLoading =
    isCatalogLoading ||
    isLoadingTotalSupply ||
    (Number(totalSupply) > 0 && isLoadingNftData);

  return (
    <main className="relative z-10">
      <Hero />

      <section className="container mx-auto px-4 -mt-8 mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            icon={Layers}
            label="Total NFTs"
            value={String(nfts.length)}
            numericValue={nfts.length}
          />
          <StatsCard
            icon={LockKeyhole}
            label="Paywalled"
            value={String(listedCount)}
            numericValue={listedCount}
          />
          <StatsCard
            icon={ShieldCheck}
            label="Wallet"
            value={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
          />
        </div>
      </section>

      <section id="nfts" className="container mx-auto px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h2 className="text-2xl font-bold">Unlockable NFT Catalog</h2>
            <p className="text-sm text-muted-foreground">
              Pay once on Base Sepolia to reveal gated NFT content.
            </p>
          </div>
          {nfts.length > 0 && (
            <Link href="/mint">
              <button className="gradient-btn-outline text-foreground text-sm font-medium px-4 py-2 rounded-full inline-flex items-center gap-2 hover:bg-white/5 transition-colors">
                Create Paywall NFT
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          )}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : nfts.length > 0
              ? nfts.map((nft, index) => (
                  <NFTCard
                    key={nft.tokenId}
                    nft={nft}
                    index={index}
                  />
                ))
              : !isLoadingTotalSupply && (
                  <div className="col-span-full text-center py-16">
                    <div className="glass-card glow-border rounded-2xl p-10 max-w-md mx-auto">
                      <LockKeyhole className="w-12 h-12 text-purple-400/60 mx-auto mb-4" />
                      <p className="mb-2 text-lg font-semibold">No NFTs found yet</p>
                      <p className="mb-6 text-sm text-muted-foreground">
                        Mint one on Base Sepolia and register it in the paywall catalog.
                      </p>
                      <Link href="/mint">
                        <button className="gradient-btn text-white font-semibold px-6 py-2.5 rounded-full text-sm inline-flex items-center gap-2">
                          Create NFT
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                )}
        </div>
      </section>
    </main>
  );
}

