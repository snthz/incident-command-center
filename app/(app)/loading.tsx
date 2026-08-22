import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <span role="status" className="sr-only">
        Loading…
      </span>

      <div className="flex flex-col gap-3">
        <div className="flex h-8 items-center">
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-64" />
      </div>

      <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
        <div className="flex items-center gap-5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="hidden gap-3 sm:grid sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-25.5" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-64" />
        ))}
      </div>
    </div>
  );
}
