"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Download, Utensils, BookOpen } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ImportContent } from "@/app/import/import-content";
import { QuickLogVisit } from "@/components/home/quick-log-visit";

interface PrimaryButtonProps {
  onClick: () => void;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

function PrimaryHomeButton({ onClick, label, Icon }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-md transition-transform active:scale-95"
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

export function ImportButtons() {
  const [importOpen, setImportOpen] = useState(false);
  const [logVisitOpen, setLogVisitOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <PrimaryHomeButton
          onClick={() => setLogVisitOpen(true)}
          label="Log Visit"
          Icon={Utensils}
        />
        <PrimaryHomeButton
          onClick={() => setAddOpen(true)}
          label="Add New"
          Icon={Plus}
        />
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
      <QuickLogVisit
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="addOnly"
      />
    </>
  );
}
