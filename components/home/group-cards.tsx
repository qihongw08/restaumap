"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface GroupCardData {
  id: string;
  name: string;
  memberCount: number;
  restaurantCount: number;
  memberAvatars: { id: string; avatarUrl?: string; username?: string }[];
}

interface GroupCardsProps {
  groups: GroupCardData[];
}

export function GroupCards({ groups: initialGroups }: GroupCardsProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(groups);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setGroups(items);

    try {
      const res = await fetch("/api/groups/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: items.map((g) => g.id) }),
      });
      if (!res.ok) throw new Error("API error");
    } catch (error) {
      console.error("Failed to reorder groups", error);
      setGroups(groups); // Revert on error
    }
  };

  if (!isMounted) {
    return null; // or a skeleton that matches the SSR content
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">
        Your Groups
      </h2>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="groups-droppable" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {groups.map((g, index) => (
                <Draggable key={g.id} draggableId={g.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex shrink-0 w-48 flex-col justify-between rounded-2xl border bg-white p-4 transition-all ${
                        snapshot.isDragging
                          ? "shadow-lg border-primary/50 scale-[1.02] rotate-2 z-50"
                          : "border-black/10 shadow-sm hover:shadow-md hover:border-primary/30"
                      }`}
                      style={provided.draggableProps.style}
                    >
                      <div className="flex justify-between items-start">
                        <Link href={`/groups/${g.id}`} className="flex-1">
                          <p className="font-black italic tracking-tight text-foreground break-words line-clamp-2 hover:underline">
                            {g.name}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {g.memberCount} member{g.memberCount !== 1 ? "s" : ""} ·{" "}
                            {g.restaurantCount} spot{g.restaurantCount !== 1 ? "s" : ""}
                          </p>
                        </Link>
                        <div
                          {...provided.dragHandleProps}
                          className="text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing p-1 -mr-2 -mt-2"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </div>
                      <Link href={`/groups/${g.id}`} className="mt-3 flex">
                        {g.memberAvatars.slice(0, 4).map((m, i) =>
                          m.avatarUrl ? (
                            <Image
                              key={m.id}
                              src={m.avatarUrl}
                              alt={m.username ?? ""}
                              width={24}
                              height={24}
                              className={`h-6 w-6 rounded-full object-cover ring-2 ring-white${
                                i > 0 ? " -ml-1.5" : ""
                              }`}
                            />
                          ) : (
                            <div
                              key={m.id}
                              className={`flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-2 ring-white text-[8px] font-black text-muted-foreground${
                                i > 0 ? " -ml-1.5" : ""
                              }`}
                            >
                              {(m.username ?? "?")[0].toUpperCase()}
                            </div>
                          )
                        )}
                      </Link>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {/* Create group card - excluded from drag and drop */}
              <Link
                href="/groups/new"
                className="flex shrink-0 w-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted bg-muted/10 p-4 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <Plus className="h-6 w-6" />
                <span className="text-xs font-black uppercase tracking-widest">
                  New Group
                </span>
              </Link>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </section>
  );
}
