import React from 'react';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';

/** Loading placeholder matching VehicleCard's layout. */
export default function VehicleCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col" aria-hidden="true">
      <Skeleton className="w-full aspect-[16/10] rounded-none" />
      <div className="p-5 flex flex-col gap-3">
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-1/2 h-3" />
        <Skeleton className="w-full h-3" />
        <div className="flex items-center justify-between gap-3 pt-3">
          <Skeleton className="w-16 h-5" />
          <Skeleton className="w-16 h-8" />
        </div>
      </div>
    </Card>
  );
}
