"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ImportContent } from "@/app/import/import-content";
import { ShareLinkButton } from "@/components/share/share-link-button";

export function ImportButtons() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex gap-3">
        <Link
          href="/restaurants/new"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-md transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" /> Add New
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground shadow-md transition-transform active:scale-95"
        >
          <Download className="h-4 w-4" /> Import
        </button>
      </div>
      <div className="mt-3">
        <ShareLinkButton
          endpoint="/api/share/user"
          label="Share"
          className="w-full justify-center rounded-2xl border-2 border-border bg-background px-4 py-3 text-xs shadow-md"
        />
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Import restaurant"
        className="max-w-lg"
      >
        <ImportContent variant="modal" onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}
