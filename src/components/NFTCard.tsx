"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import Image from "next/image";
import { formatEther, type Hash } from "viem";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import Confetti from "react-confetti";
import { Loader2, LockKeyhole, Copy, Check, Eye, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import {
  createPaymentSession,
  fetchProtectedNft,
  hasAccess,
  verifyPayment,
  type ProtectedNft,
} from "@/lib/backend";

import { type NftData } from "../app/page";

interface NFTCardProps {
  nft: NftData;
  index?: number;
}

const isImageLike = (url: string) =>
  /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(url);

export default function NFTCard({ nft, index = 0 }: NFTCardProps) {
  const { tokenId, metadata, owner, listing } = nft;
  const { address } = useAccount();
  const { sendTransactionAsync, isPending: isSendingPayment } = useSendTransaction();
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [isVerifyingAccess, setIsVerifyingAccess] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [content, setContent] = useState<ProtectedNft | null>(null);
  const [canViewContent, setCanViewContent] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submittedPaymentHash, setSubmittedPaymentHash] = useState<Hash | null>(null);
  const { toast } = useToast();
  const verifiedHashes = useRef<Set<string>>(new Set());

  const {
    data: paymentReceipt,
    error: paymentReceiptError,
    isError: isPaymentReceiptError,
    isLoading: isConfirmingPayment,
    isSuccess: isPaymentConfirmed,
  } =
    useWaitForTransactionReceipt({
      hash: submittedPaymentHash ?? undefined,
      confirmations: 1,
      query: {
        enabled: Boolean(submittedPaymentHash),
      },
    });

  useEffect(() => {
    if (!listing || !address) {
      setCanViewContent(false);
      setContent(null);
      return;
    }

    let isMounted = true;
    setIsCheckingAccess(true);

    hasAccess(tokenId, address)
      .then((granted) => {
        if (isMounted) {
          setCanViewContent(granted);
        }
      })
      .catch((error) => {
        console.error("Failed to check NFT access:", error);
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingAccess(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [address, listing, tokenId]);

  useEffect(() => {
    if (
      !submittedPaymentHash ||
      !paymentReceipt ||
      !isPaymentConfirmed ||
      !address ||
      verifiedHashes.current.has(submittedPaymentHash)
    ) {
      return;
    }

    verifiedHashes.current.add(submittedPaymentHash);
    setIsVerifyingAccess(true);

    verifyPayment({
      walletAddress: address,
      nftId: tokenId,
      txHash: submittedPaymentHash,
    })
      .then(async () => {
        setCanViewContent(true);
        const protectedNft = await fetchProtectedNft(tokenId, address);
        setContent(protectedNft);
        setIsDialogOpen(true);
        setShowConfetti(true);
        toast({
          title: "Access granted",
          description: `Payment verified for NFT #${tokenId}. Revealing the image now.`,
        });
        setSubmittedPaymentHash(null);
        setTimeout(() => setShowConfetti(false), 5000);
      })
      .catch((error) => {
        verifiedHashes.current.delete(submittedPaymentHash);
        toast({
          title: "Payment verification failed",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsVerifyingAccess(false);
      });
  }, [address, isPaymentConfirmed, paymentReceipt, submittedPaymentHash, toast, tokenId]);

  useEffect(() => {
    if (!isPaymentReceiptError || !paymentReceiptError) {
      return;
    }

    setSubmittedPaymentHash(null);
    toast({
      title: "Payment confirmation failed",
      description:
        paymentReceiptError instanceof Error
          ? paymentReceiptError.message
          : String(paymentReceiptError),
      variant: "destructive",
    });
  }, [isPaymentReceiptError, paymentReceiptError, toast]);

  const shortenedAddress = (value: string) => {
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const handleCopyAddress = () => {
    if (owner) {
      navigator.clipboard.writeText(owner);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const listedPrice = useMemo(() => {
    if (!listing) {
      return null;
    }

    return formatEther(BigInt(listing.price));
  }, [listing]);

  const handleUnlock = async () => {
    if (!listing) {
      toast({
        title: "Listing unavailable",
        description: "This NFT has not been registered in the paywall catalog yet.",
        variant: "destructive",
      });
      return;
    }

    if (!address) {
      toast({
        title: "Connect your wallet",
        description: "A wallet connection is required before unlocking NFT content.",
        variant: "destructive",
      });
      return;
    }

    try {
      const session = await createPaymentSession({
        nftId: tokenId,
        walletAddress: address,
      });

      if (session.hasAccess || !session.session) {
        setCanViewContent(true);
        toast({
          title: "Access already available",
          description: "Your wallet already has access to this NFT.",
        });
        return;
      }

      const txHash = await sendTransactionAsync({
        to: session.session.paymentInstructions.to,
        value: BigInt(session.session.paymentInstructions.valueWei),
      });

      setSubmittedPaymentHash(txHash);

      toast({
        title: "Payment submitted",
        description: `Transaction ${txHash.slice(0, 10)}... submitted. Waiting for Base Sepolia confirmation.`,
      });
    } catch (error) {
      setSubmittedPaymentHash(null);
      toast({
        title: "Unlock failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleViewContent = async () => {
    if (!address) {
      toast({
        title: "Connect your wallet",
        description: "Connect the wallet that paid for this NFT.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingContent(true);
      const protectedNft = await fetchProtectedNft(tokenId, address);
      setContent(protectedNft);
      setIsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Unable to load NFT content",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoadingContent(false);
    }
  };

  const isProcessing =
    isSendingPayment ||
    isConfirmingPayment ||
    isCheckingAccess ||
    isVerifyingAccess ||
    isLoadingContent;

  return (
    <>
      {showConfetti && <Confetti />}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
        >
          <Card className="overflow-hidden glass-card glow-border-hover border-white/[0.06] transition-all duration-500 hover:scale-[1.02] group">
            <CardHeader className="p-0">
              <div className="relative w-full h-64 overflow-hidden">
                {metadata?.image ? (
                  <Image
                    src={metadata.image}
                    alt={metadata.name || ""}
                    fill
                    className={`object-cover transition-all duration-700 group-hover:scale-110 ${
                      canViewContent
                        ? "group-hover:brightness-110"
                        : "scale-105 blur-xl brightness-75"
                    }`}
                  />
                ) : (
                  <div className="w-full h-full shimmer rounded-t-lg" />
                )}
                {!canViewContent && listing && (
                  <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
                )}
                <div className="absolute top-3 right-3 glow-badge rounded-full bg-black/50 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">
                  {canViewContent ? "Unlocked" : listing ? `${listedPrice} ETH` : "Pending"}
                </div>
                {!canViewContent && listing && (
                  <div className="absolute inset-x-0 bottom-3 flex justify-center">
                    <div className="rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      Preview blurred until payment
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5">
              <CardTitle className="text-base font-bold">{metadata?.name || `NFT #${tokenId}`}</CardTitle>
              <p className="text-sm text-muted-foreground truncate leading-relaxed">{metadata?.description}</p>
              {listing ? (
                <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Paywall Price
                  </p>
                  <p className="text-sm font-semibold gradient-text">{listedPrice} ETH</p>
                </div>
              ) : (
                <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                  <p className="text-sm text-muted-foreground">
                    This token exists on-chain, but its paywall listing has not been configured yet.
                  </p>
                </div>
              )}
              {typeof owner === "string" && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground font-mono">
                    {shortenedAddress(owner)}
                  </p>
                  <button
                    onClick={handleCopyAddress}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between items-center p-4 border-t border-white/[0.06]">
              <div>
                <p className="text-sm font-bold gradient-text">
                  {canViewContent ? "Content unlocked" : listing ? "Locked content" : "Not listed"}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {listing ? "Verified by backend" : "Awaiting registration"}
                </p>
              </div>
              <button
                disabled={isProcessing || !listing}
                onClick={() => {
                  if (canViewContent) {
                    void handleViewContent();
                    return;
                  }

                  void handleUnlock();
                }}
                className="gradient-btn text-white text-sm font-semibold px-5 py-2 rounded-full inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {isVerifyingAccess
                      ? "Verifying"
                      : isConfirmingPayment
                        ? "Confirming"
                        : isLoadingContent
                          ? "Loading"
                          : "Processing"}
                  </>
                ) : canViewContent ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </>
                ) : (
                  <>
                    <LockKeyhole className="w-3.5 h-3.5" />
                    Unlock
                  </>
                )}
              </button>
            </CardFooter>
          </Card>
        </motion.div>

        <DialogContent className="glass-card border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {metadata?.name || `NFT #${tokenId}`}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Your wallet has been verified. Use the protected content below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {content?.contentUrl && isImageLike(content.contentUrl) ? (
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30">
                <img
                  src={content.contentUrl}
                  alt={content.title}
                  className="max-h-80 w-full object-contain"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-sm text-muted-foreground">
                  Payment succeeded, but this protected asset is not an image preview.
                </p>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 rounded-xl px-3 py-2">
              <ShieldCheck className="w-4 h-4" />
              Access confirmed for {address ? shortenedAddress(address) : "connected wallet"}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

