"use client";

import { useState } from "react";
import { Bookmark as BookmarkIcon, List, X } from "lucide-react";
import type { ChapterMeta } from "@/lib/types";

export interface BookmarkRow {
  id: number;
  chapterId: number;
  scrollRatio: number;
  excerpt: string;
  createdAt: string;
}

export default function ChapterDrawer({
  bookTitle,
  chapters,
  currentId,
  bookmarks,
  onJump,
  onJumpBookmark,
  onDeleteBookmark,
  onClose,
  fg,
  sub,
  ui,
}: {
  bookTitle: string;
  chapters: ChapterMeta[];
  currentId: number | null;
  bookmarks: BookmarkRow[];
  onJump: (chapterId: number) => void;
  onJumpBookmark: (b: BookmarkRow) => void;
  onDeleteBookmark: (id: number) => void;
  onClose: () => void;
  fg: string;
  sub: string;
  ui: string;
}) {
  const [tab, setTab] = useState<"toc" | "marks">("toc");

  return (
    <div className="anim-fade-in fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="anim-drawer flex h-full w-[82%] max-w-sm flex-col shadow-2xl"
        style={{ background: ui, color: fg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-black/10 px-5 pb-4 pt-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-lg font-bold">{bookTitle}</h2>
              <p className="mt-0.5 text-xs" style={{ color: sub }}>
                共 {chapters.length} 章
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 opacity-60 transition active:scale-90" aria-label="关闭">
              <X size={17} />
            </button>
          </div>
          <div className="mt-4 flex rounded-full p-1" style={{ background: "rgba(0,0,0,0.08)" }}>
            {(
              [
                { id: "toc", name: "目录", icon: List },
                { id: "marks", name: `书签 ${bookmarks.length}`, icon: BookmarkIcon },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs transition ${
                  tab === t.id ? "font-semibold shadow-sm" : "opacity-55"
                }`}
                style={tab === t.id ? { background: fg, color: ui } : undefined}
              >
                <t.icon size={13} />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {tab === "toc" ? (
            <ul>
              {chapters.map((c) => {
                const active = c.id === currentId;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => onJump(c.id)}
                      className="flex w-full items-baseline justify-between gap-3 px-5 py-3 text-left transition active:opacity-60"
                      style={active ? { background: "rgba(0,0,0,0.07)" } : undefined}
                    >
                      <span
                        className={`min-w-0 truncate text-[13px] ${active ? "font-bold" : ""}`}
                        style={{ color: active ? undefined : sub }}
                      >
                        {active && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />}
                        {c.title}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums" style={{ color: sub, opacity: 0.7 }}>
                        {c.wordCount >= 1000 ? `${(c.wordCount / 1000).toFixed(1)}k` : c.wordCount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : bookmarks.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-xs" style={{ color: sub }}>
              <BookmarkIcon size={20} className="mb-2 opacity-40" />
              阅读时点击右上角书签图标即可收藏当前位置
            </div>
          ) : (
            <ul>
              {bookmarks.map((b) => (
                <li key={b.id} className="group relative">
                  <button
                    onClick={() => onJumpBookmark(b)}
                    className="w-full px-5 py-3.5 text-left transition active:opacity-60"
                  >
                    <p className="line-clamp-2 text-[13px] leading-relaxed">「{b.excerpt || "未命名书签"}」</p>
                    <p className="mt-1 text-[10px]" style={{ color: sub }}>
                      {new Date(b.createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </button>
                  <button
                    onClick={() => onDeleteBookmark(b.id)}
                    className="absolute right-3 top-3 rounded-full p-1.5 opacity-30 transition active:scale-90"
                    aria-label="删除书签"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
