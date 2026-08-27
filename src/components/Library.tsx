"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileUp,
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  X,
  Combine,
} from "lucide-react";
import type { BookMeta } from "@/lib/types";

function fmtWords(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)} 万字` : `${n} 字`;
}

/** 书籍封面：由色相派生的渐变 + 排版 */
function Cover({ book, large }: { book: BookMeta; large?: boolean }) {
  const h = book.coverHue;
  return (
    <div
      className="cover-texture relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-xl p-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7)]"
      style={{
        background: `linear-gradient(160deg, hsl(${h} 32% 30%) 0%, hsl(${h} 40% 16%) 60%, hsl(${(h + 24) % 360} 42% 11%) 100%)`,
      }}
    >
      <div className="flex items-start justify-between">
        <span className="rounded bg-white/12 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-white/80 backdrop-blur">
          {book.format.toUpperCase()}
        </span>
        {book.progressRatio != null && book.progressRatio > 0 && (
          <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] text-amber-200/90">
            {Math.round(book.progressRatio * 100)}%
          </span>
        )}
      </div>
      <div>
        <h3
          className={`font-serif font-bold leading-snug text-white/95 ${large ? "text-lg" : "text-[15px]"}`}
          style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {book.title}
        </h3>
        <p className="mt-1 truncate text-[11px] text-white/55">{book.author}</p>
        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
            style={{ width: `${Math.round((book.progressRatio ?? 0) * 100)}%` }}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute left-0 top-0 h-full w-[6px] bg-black/25" />
    </div>
  );
}

export default function Library({ initialBooks }: { initialBooks: BookMeta[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [books, setBooks] = useState(initialBooks);
  const [importing, setImporting] = useState(false);
  const [manageId, setManageId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [merging, setMerging] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  async function importFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImporting(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/books", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || `「${file.name}」导入失败`);
          continue;
        }
        showToast(`已导入《${data.book.title}》`);
      }
      router.refresh();
      const res = await fetch("/api/books");
      const data = await res.json();
      setBooks(data.books);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function addSample() {
    setImporting(true);
    try {
      await fetch("/api/books/sample", { method: "POST" });
      const res = await fetch("/api/books");
      const data = await res.json();
      setBooks(data.books);
      router.refresh();
      showToast("示例书已加入书架");
    } finally {
      setImporting(false);
    }
  }

  async function removeBook(id: number) {
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    setBooks((bs) => bs.filter((b) => b.id !== id));
    setManageId(null);
    showToast("已删除");
    router.refresh();
  }

  async function mergeChapters(id: number) {
    setMerging(true);
    try {
      const res = await fetch(`/api/books/${id}/merge`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "合并失败");
        return;
      }
      const list = await fetch("/api/books").then((r) => r.json());
      setBooks(list.books);
      setManageId(null);
      router.refresh();
      showToast(`已合并为 1 章（${fmtWords(data.wordCount)}）`);
    } finally {
      setMerging(false);
    }
  }

  const totalWords = books.reduce((s, b) => s + b.wordCount, 0);
  const managed = books.find((b) => b.id === manageId);

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-5 pb-28 pt-12">
      {/* 头部 */}
      <header className="anim-fade-up flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold tracking-wide text-[#f0e9dc]">墨阅</h1>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium tracking-widest text-amber-300">
              MREAD
            </span>
          </div>
          <p className="mt-1.5 text-xs tracking-wide text-zinc-500">
            {books.length > 0
              ? `藏书 ${books.length} 本 · 共 ${fmtWords(totalWords)}`
              : "沉浸式 Markdown 小说阅读器"}
          </p>
        </div>
        <button
          onClick={() => router.push("/settings")}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition active:scale-90"
          aria-label="设置与字体"
        >
          <Settings2 size={18} />
        </button>
      </header>

      {/* 书架 */}
      {books.length > 0 ? (
        <div className="stagger mt-8 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4">
          {books.map((b) => (
            <div key={b.id} className="group relative">
              <button
                onClick={() => router.push(`/reader/${b.id}`)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setManageId(b.id);
                }}
                className="block w-full text-left transition duration-300 active:scale-95"
              >
                <Cover book={b} />
                <div className="mt-2 flex items-center justify-between px-0.5">
                  <span className="truncate text-[11px] text-zinc-500">
                    {b.chapterCount} 章 · {fmtWords(b.wordCount)}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setManageId(b.id)}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-zinc-800 text-zinc-400 shadow-lg transition active:scale-90"
                aria-label="管理"
              >
                <span className="text-[13px] leading-none">···</span>
              </button>
            </div>
          ))}

          {/* 导入卡片 */}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/12 bg-white/[0.03] text-zinc-500 transition hover:border-amber-500/40 hover:text-amber-300 active:scale-95"
          >
            {importing ? <Loader2 className="animate-spin" size={22} /> : <Plus size={22} />}
            <span className="text-xs">导入书籍</span>
            <span className="text-[10px] text-zinc-600">.md / .txt</span>
          </button>
        </div>
      ) : (
        /* 空状态 */
        <div className="anim-fade-up mt-20 flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-2xl">
            <BookOpen size={36} className="text-amber-400/80" />
          </div>
          <h2 className="mt-6 font-serif text-xl font-bold text-zinc-200">书架还空着</h2>
          <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-zinc-500">
            导入你的 Markdown / TXT 小说，或先试试内置示例书体验完整功能
          </p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-amber-900/40 transition active:scale-95"
            >
              {importing ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
              导入书籍
            </button>
            <button
              onClick={addSample}
              disabled={importing}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-zinc-300 transition active:scale-95"
            >
              <Sparkles size={16} className="text-amber-300" />
              示例书
            </button>
          </div>
        </div>
      )}

      {/* 导入中的浮动提示 */}
      {importing && books.length > 0 && (
        <div className="fixed bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-zinc-900/95 px-4 py-2 text-sm text-zinc-300 shadow-2xl backdrop-blur">
          <Loader2 className="animate-spin text-amber-400" size={15} />
          正在解析导入…
        </div>
      )}

      {/* 管理弹层 */}
      {managed && (
        <div
          className="anim-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setManageId(null)}
        >
          <div
            className="anim-sheet w-full max-w-md rounded-t-3xl border-t border-white/10 bg-zinc-900 p-5 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="w-12 shrink-0">
                <Cover book={managed} />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <h3 className="truncate font-serif font-bold text-zinc-100">{managed.title}</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {managed.author} · {managed.chapterCount} 章 · {fmtWords(managed.wordCount)}
                </p>
              </div>
              <button
                onClick={() => setManageId(null)}
                className="rounded-full p-1.5 text-zinc-500 active:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <button
              onClick={() => {
                router.push(`/reader/${managed.id}`);
                setManageId(null);
              }}
              className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white/5 px-4 py-3.5 text-sm text-zinc-200 transition active:bg-white/10"
            >
              <BookOpen size={17} className="text-amber-400" />
              {managed.progressRatio ? "继续阅读" : "开始阅读"}
            </button>
            {managed.chapterCount > 1 && (
              <button
                onClick={() => mergeChapters(managed.id)}
                disabled={merging}
                className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white/5 px-4 py-3.5 text-sm text-zinc-200 transition active:bg-white/10 disabled:opacity-50"
              >
                {merging ? (
                  <Loader2 size={17} className="animate-spin text-sky-400" />
                ) : (
                  <Combine size={17} className="text-sky-400" />
                )}
                合并为一章（当前 {managed.chapterCount} 章）
              </button>
            )}
            <button
              onClick={() => removeBook(managed.id)}
              className="flex w-full items-center gap-3 rounded-2xl bg-red-500/10 px-4 py-3.5 text-sm text-red-400 transition active:bg-red-500/20"
            >
              <Trash2 size={17} />
              从书架删除
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="anim-fade-up fixed bottom-24 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-zinc-800/95 px-4 py-2 text-xs text-zinc-200 shadow-2xl">
          {toast}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".md,.markdown,.txt,.text,text/plain,text/markdown"
        multiple
        hidden
        onChange={(e) => importFiles(e.target.files)}
      />
    </div>
  );
}
