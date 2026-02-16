'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calculatePFRatio, clampScore } from '@/lib/utils';
import { PF_RATIO_FULLNESS_MAX, PF_RATIO_TASTE_MAX } from '@/lib/constants';

interface VisitFormProps {
  restaurantId: string;
}

export function VisitForm({ restaurantId }: VisitFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [visitDate, setVisitDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [fullnessScore, setFullnessScore] = useState(5);
  const [tasteScore, setTasteScore] = useState(5);
  const [pricePaid, setPricePaid] = useState('');
  const [notes, setNotes] = useState('');

  const priceNum = parseFloat(pricePaid);
  const validPrice = Number.isFinite(priceNum) && priceNum > 0;
  const pfRatio = validPrice
    ? calculatePFRatio(fullnessScore, tasteScore, priceNum)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPrice) {
      setError('Enter a valid price (e.g. 25.50)');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          visitDate,
          fullnessScore: clampScore(fullnessScore, 1, PF_RATIO_FULLNESS_MAX),
          tasteScore: clampScore(tasteScore, 1, PF_RATIO_TASTE_MAX),
          pricePaid: priceNum,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save visit');
      }
      router.refresh();
      setPricePaid('');
      setNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-6">
        <Input
          label="WHEN DID YOU VISIT?"
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          className="text-xs font-black uppercase tracking-widest"
        />

        <div className="space-y-6 rounded-3xl bg-muted/30 p-6 border border-border">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                FULLNESS SCORE
              </label>
              <span className="text-sm font-black italic text-primary">{fullnessScore}/{PF_RATIO_FULLNESS_MAX}</span>
            </div>
            <input
              type="range"
              min={1}
              max={PF_RATIO_FULLNESS_MAX}
              value={fullnessScore}
              onChange={(e) => setFullnessScore(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                TASTE EXPERIENCE
              </label>
              <span className="text-sm font-black italic text-primary">{tasteScore}/{PF_RATIO_TASTE_MAX}</span>
            </div>
            <input
              type="range"
              min={1}
              max={PF_RATIO_TASTE_MAX}
              value={tasteScore}
              onChange={(e) => setTasteScore(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        <div className="relative">
          <Input
            label="TOTAL PRICE PAID"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={pricePaid}
            onChange={(e) => setPricePaid(e.target.value)}
            error={error ?? undefined}
            className="pl-12 text-lg font-black italic"
          />
          <span className="absolute left-4 top-[3.25rem] text-lg font-black italic text-muted-foreground">$</span>
        </div>

        {validPrice && (
          <div className="flex items-center justify-between rounded-2xl bg-primary px-6 py-4 shadow-lg animate-in zoom-in duration-300">
            <span className="text-xs font-black uppercase tracking-widest text-primary-foreground opacity-80">PF RATIO™</span>
            <span className="text-2xl font-black italic text-primary-foreground tracking-tighter">
              {pfRatio.toFixed(2)}
            </span>
          </div>
        )}

        <Input
          label="ORDER NOTES (OPTIONAL)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What made this visit special?"
          className="text-sm font-bold"
        />

        <Button 
          type="submit" 
          disabled={isSubmitting || !validPrice}
          size="lg"
          className="w-full h-16 rounded-full text-xl shadow-[0_10px_30px_rgb(255,215,0,0.3)]"
        >
          {isSubmitting ? 'SAVING JOURNEY…' : 'LOG VISIT'}
        </Button>
      </div>
    </form>
  );
}
