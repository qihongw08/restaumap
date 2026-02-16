'use client';

import { formatPFRatio } from '@/lib/utils';
import type { Visit } from '@/types/visit';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';

interface PFRatioDisplayProps {
  visits: Visit[];
}

export function PFRatioDisplay({ visits }: PFRatioDisplayProps) {
  if (visits.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2">
      {visits.map((visit) => (
        <li
          key={visit.id}
          className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2"
        >
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            {format(new Date(visit.visitDate), 'MMM d, yyyy')}
          </div>
          <div className="text-right">
            <span className="font-semibold text-[#FF6B6B]">
              PF {formatPFRatio(visit.pfRatio)}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              ({visit.fullnessScore}F × {visit.tasteScore}T / ${visit.pricePaid.toFixed(0)})
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
