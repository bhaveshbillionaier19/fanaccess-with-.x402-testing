import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function SkeletonCard() {
  return (
    <Card className="overflow-hidden glass-card glow-border border-white/[0.06]">
      <CardHeader className="p-0">
        <div className="w-full h-64 shimmer rounded-t-lg" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="h-5 w-3/4 shimmer rounded-lg" />
        <div className="h-4 w-full shimmer rounded-lg" />
        <div className="h-3 w-1/2 shimmer rounded-lg" />
      </CardContent>
      <CardFooter className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between w-full">
          <div className="space-y-1">
            <div className="h-4 w-20 shimmer rounded" />
            <div className="h-3 w-16 shimmer rounded" />
          </div>
          <div className="h-9 w-24 shimmer rounded-full" />
        </div>
      </CardFooter>
    </Card>
  );
}
