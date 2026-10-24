import React from 'react';
import Card from '../ui/Card';
import PriceDisplay from '../ui/PriceDisplay';
import { formatDateRange, calculateTotalPrice } from '../../lib/utils';
import { DetailList, DetailRow } from '../ui/DetailList';

/**
 * @param {object} booking — { startTime, endTime, numberOfDays }
 * @param {object} vehicle — { model, dailyPrice }
 */
export default function PaymentSummary({ booking, vehicle, paid = false, className = '' }) {
  const total = calculateTotalPrice(vehicle?.dailyPrice, booking?.numberOfDays);

  return (
    <Card className={`p-4 flex flex-col gap-3 ${className}`}>
      <div>
        <h3 className="font-heading text-ink font-semibold">{vehicle?.model}</h3>
        {booking?.startTime && booking?.endTime && (
          <p className="text-muted text-xs mt-1">{formatDateRange(booking.startTime, booking.endTime)}</p>
        )}
      </div>
      <div className="pt-3 border-t border-ink/10">
        <DetailList>
          <DetailRow label={paid ? 'Total Paid' : 'Total Due'}>
            <PriceDisplay amount={total} period="" size="md" />
          </DetailRow>
        </DetailList>
      </div>
    </Card>
  );
}
