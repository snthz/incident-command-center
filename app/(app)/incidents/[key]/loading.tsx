import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy className="flex flex-col gap-5">
      <span role="status" className="sr-only">
        Loading incident…
      </span>

      <div className="flex h-11 items-center">
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-8">
          <Skeleton className="h-8 w-3/4 max-w-xl" />

          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-full max-w-3xl" />
            <Skeleton className="h-4 w-2/3 max-w-2xl" />
          </div>

          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full" />
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3.5 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
