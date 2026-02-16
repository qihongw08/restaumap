'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PRICE_RANGE_OPTIONS } from '@/lib/constants';

interface RestaurantFormProps {
  onSuccess?: () => void;
}

export function RestaurantForm({ onSuccess }: RestaurantFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [cuisineTypes, setCuisineTypes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      let formattedAddress: string | null = address.trim() || null;

      if (address.trim()) {
        const geoRes = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: address.trim() }),
        });
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          latitude = geoJson.data?.latitude ?? null;
          longitude = geoJson.data?.longitude ?? null;
          formattedAddress = geoJson.data?.formattedAddress ?? address.trim();
        }
      }

      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          formattedAddress,
          latitude,
          longitude,
          cuisineTypes: cuisineTypes
            ? cuisineTypes.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          popularDishes: [],
          priceRange: priceRange || null,
          ambianceTags: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create restaurant');
      }
      const json = await res.json();
      onSuccess?.();
      router.push(`/restaurants/${json.data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Restaurant name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Joe's Pizza"
      />
      <Input
        label="Address (optional)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Street, city, state"
      />
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Price range
        </label>
        <select
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#FF6B6B] focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]"
        >
          <option value="">Select</option>
          {PRICE_RANGE_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <Input
        label="Cuisine types (comma-separated)"
        value={cuisineTypes}
        onChange={(e) => setCuisineTypes(e.target.value)}
        placeholder="e.g. Italian, Pizza"
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Add restaurant'}
      </Button>
    </form>
  );
}
