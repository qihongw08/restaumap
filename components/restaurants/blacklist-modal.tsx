"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { BLACKLIST_REASONS } from "@/lib/constants";

type ReasonValue = (typeof BLACKLIST_REASONS)[number]["value"];

interface BlacklistModalProps {
  open: boolean;
  onClose: () => void;
  restaurantName: string;
  onConfirm: (reason: string) => Promise<void>;
}

export function BlacklistModal({
  open,
  onClose,
  restaurantName,
  onConfirm,
}: BlacklistModalProps) {
  const [reason, setReason] = useState<ReasonValue>(BLACKLIST_REASONS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      onClose();
      setReason(BLACKLIST_REASONS[0].value);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Never again">
      <p className="mb-3 text-sm text-gray-600">
        Hide &ldquo;{restaurantName}&rdquo; from your map and list. Why?
      </p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as ReasonValue)}
        className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#FF6B6B] focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]"
      >
        {BLACKLIST_REASONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Hiding…" : "Hide forever"}
        </Button>
      </div>
    </Modal>
  );
}
