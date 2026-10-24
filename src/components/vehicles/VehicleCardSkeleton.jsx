import React from 'react';
import Skeleton from '../ui/Skeleton';

/** Loading placeholder matching VehicleCard's layout (the design system's car card). */
export default function VehicleCardSkeleton() {
  return (
    <div className="flex flex-col rounded-[15px] border border-line bg-surface p-1.5" aria-hidden="true">
      <Skeleton className="w-full aspect-[4/3] rounded-[11px]" />
      <div className="flex flex-col gap-2 px-2 pb-1.5 pt-2.5">
        <Skeleton className="w-3/4 h-3.5" />
        <Skeleton className="w-10 h-3" />
        <Skeleton className="w-1/2 h-3" />
        <div className="flex items-center justify-between gap-2 pt-1.5">
          <Skeleton className="w-16 h-3.5" />
          <Skeleton className="w-16 h-7 rounded-full" />
        </div>
      </div>
    </div>
  );
}
