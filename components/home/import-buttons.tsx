"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Download, Utensils, BookOpen } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ImportContent } from "@/app/import/import-content";
import { QuickLogVisit } from "@/components/home/quick-log-visit";

export function ImportButtons() {
  const [importOpen, setImportOpen] = useState(false);
  const [logVisitOpen, setLogVisitOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setLogVisitOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-md transition-transform active:scale-95"
        >
          <Utensils className="h-4 w-4" /> Log Visit
        </button>
        <Link
          href="/restaurants/new"
          className="flex items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground shadow-md transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" /> Add New
        </Link>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground transition-transform active:scale-95"
        >
          <Download className="h-4 w-4" /> Import
        </button>
        <Link
          href="/restaurants"
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground transition-transform active:scale-95"
        >
          <BookOpen className="h-4 w-4" /> Collection
        </Link>
      </div>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import restaurant"
        className="max-w-lg"
      >
        <ImportContent variant="modal" onClose={() => setImportOpen(false)} />
      </Modal>

      <QuickLogVisit
        open={logVisitOpen}
        onClose={() => setLogVisitOpen(false)}
      />
    </>
  );
}
