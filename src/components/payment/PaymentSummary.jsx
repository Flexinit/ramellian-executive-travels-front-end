import React from 'react';
import Card from '../ui/Card';
import PriceDisplay from '../ui/PriceDisplay';
import { formatDateRange, calculateTotalPrice } from '../../lib/utils';

/**
 * @param {object} booking — { startTime, endTime, numberOfDays }
 * @param {object} vehicle — { model, dailyPrice }
 */
export default function PaymentSummary({ booking, vehicle }) {
  const total = calculateTotalPrice(vehicle?.dailyPrice, booking?.numberOfDays);

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-heading text-brand-white font-semibold">{vehicle?.model}</h3>
        {booking?.startTime && booking?.endTime && (
          <p className="text-brand-grey text-xs mt-1">{formatDateRange(booking.startTime, booking.endTime)}</p>
        )}
      </div>
      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-brand-grey text-sm">Total Due</span>
        <PriceDisplay amount={total} period="" size="lg" />
      </div>
    </Card>
  );
}
