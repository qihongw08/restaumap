'use client';

import { format } from 'date-fns';
import { formatPFRatio } from '@/lib/utils';
import type { Visit } from '@/types/visit';
import { Card, CardContent } from '@/components/ui/card';

interface VisitCardProps {
  visit: Visit;
}

export function VisitCard({ visit }: VisitCardProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {format(new Date(visit.visitDate), 'MMM d, yyyy')}
          </span>
          <span className="font-semibold text-[#FF6B6B]">
            PF {formatPFRatio(visit.pfRatio)}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Fullness {visit.fullnessScore} × Taste {visit.tasteScore} / $
          {visit.pricePaid.toFixed(2)}
        </p>
        {visit.notes && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{visit.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
