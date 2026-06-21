import { Skeleton } from "./skeleton";

interface CardSkeletonProps {
  variant?: "kpi" | "doctor" | "room" | "generic";
  count?: number;
}

export function CardSkeleton({ variant = "generic", count = 1 }: CardSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "kpi") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full" data-testid="card-skeleton-kpi">
        {items.map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              {/* Icon skeleton */}
              <Skeleton className="w-9 h-9 rounded-xl" />
              {/* Trend badge skeleton */}
              <Skeleton className="w-12 h-4 rounded-full" />
            </div>
            {/* Value skeleton */}
            <Skeleton className="w-16 h-8 rounded" />
            {/* Label skeleton */}
            <Skeleton className="w-24 h-4 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "doctor") {
    return (
      <div className="space-y-2 w-full" data-testid="card-skeleton-doctor">
        {items.map((i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-white">
            <div className="flex items-center gap-3">
              {/* Radio selector circle */}
              <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
              {/* Doctor Avatar */}
              <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                {/* Doctor Name */}
                <Skeleton className="w-32 h-4 rounded" />
                {/* Specialty & Room */}
                <Skeleton className="w-44 h-3.5 rounded" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {/* Wait Time */}
              <Skeleton className="w-14 h-4 rounded" />
              {/* Est wait label */}
              <Skeleton className="w-10 h-3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "room") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full" data-testid="card-skeleton-room">
        {items.map((i) => (
          <div key={i} className="p-3 rounded-xl border border-border bg-white space-y-2.5">
            {/* Room Name */}
            <Skeleton className="w-20 h-4.5 rounded" />
            {/* Patients count */}
            <Skeleton className="w-28 h-3.5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Generic card skeleton fallback
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full" data-testid="card-skeleton-generic">
      {items.map((i) => (
        <div key={i} className="bg-white rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="w-2/3 h-4.5 rounded" />
              <Skeleton className="w-1/2 h-3.5 rounded" />
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Skeleton className="w-full h-4 rounded" />
            <Skeleton className="w-5/6 h-4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
