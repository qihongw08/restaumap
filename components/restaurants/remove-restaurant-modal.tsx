"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface RemoveRestaurantModalProps {
  open: boolean;
  onClose: () => void;
  restaurantName: string;
  onConfirm: () => Promise<void>;
}

export function RemoveRestaurantModal({
  open,
  onClose,
  restaurantName,
  onConfirm,
}: RemoveRestaurantModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Remove from list">
      <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
        Remove &ldquo;{restaurantName}&rdquo; from your database? This cannot be
        undone.
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} size="md">
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={isSubmitting}
          size="md"
        >
          {isSubmitting ? "Removing…" : "Remove"}
        </Button>
      </div>
    </Modal>
  );
}
