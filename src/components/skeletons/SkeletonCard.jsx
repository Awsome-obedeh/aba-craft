import Skeleton from "./ui/Skeleton";

export function SkeletonCard() {
  return (
    <div className="rounded-xl border p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <Skeleton className="h-12 w-full mb-3" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}