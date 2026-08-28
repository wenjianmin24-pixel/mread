"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileUp,
  Loader2,
  PenLine,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  X,
  Combine,
  Check,
  ClipboardPen,
} from "lucide-react";
import { FONT_STACKS, type BookMeta } from "@/lib/types";

function fmtWords(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)} 万字` : `${n} 字`;
}

/** 书籍封面：由色相派生的渐变 + 排版 */
function Cover({
  book,
  large,
  titleSize = 15,
  titleFont,
}: {
  book: BookMeta;
  large?: boolean;
  titleSize?: number;
  titleFont?: string;
}) {
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
          className={`font-bold leading-snug text-white/95 ${large ? "text-lg" : ""}`}
          style={{
            fontSize: large ? undefined : titleSize,
            fontFamily: titleFont,
            display: "-webkit-box",
            WebkitLineClamp: titleSize >= 18 ? 2 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
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
  const [coverTitleSize, setCoverTitleSize] = useState(15);
  const [titleFont, setTitleFont] = useState<string>(FONT_STACKS.serif);

  // 编辑书名/作者
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  // 粘贴新建小说
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newText, setNewText] = useState("");
  const [newFormat, setNewFormat] = useState<"md" | "txt">("md");
  const [creatingBusy, setCreatingBusy] = useState(false);

  // 读取书架设置（封面字号 + 标题字体跟随正文字体），必要时注入自定义字体
  useEffect(() => {
    (async () => {
      try {
        const [setRes, fontRes] = await Promise.all([
          fetch("/api/settings").then((r) => r.json()),
          fetch("/api/fonts").then((r) => r.json()),
        ]);
        const s = setRes.settings ?? {};
        if (typeof s.coverTitleSize === "number") setCoverTitleSize(s.coverTitleSize);

        const fonts = (fontRes.fonts ?? []) as { id: number }[];
        if (fonts.length) {
          const style = document.createElement("style");
          style.textContent = fonts
            .map(
              (f) =>
                `@font-face{font-family:"custom-font-${f.id}";src:url("/api/fonts/${f.id}/file");font-display:swap;}`
            )
            .join("\n");
          document.head.appendChild(style);
        }

        const fam: string = s.fontFamily ?? "serif";
        setTitleFont(
          fam.startsWith("custom:")
            ? `"custom-font-${fam.split(":")[1]}"`
            : FONT_STACKS[fam] ?? FONT_STACKS.serif
        );
      } catch {
        /* 忽略 */
      }
    })();
  }, []);

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

  function startEdit() {
    if (!managed) return;
    setEditTitle(managed.title);
    setEditAuthor(managed.author === "未知作者" ? "" : managed.author);
    setEditing(true);
  }

  async function saveMeta() {
    if (!managed) return;
    const title = editTitle.trim();
    if (!title) {
      showToast("书名不能为空");
      return;
    }
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/books/${managed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author: editAuthor.trim() || "未知作者" }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "保存失败");
        return;
      }
      setBooks((bs) => bs.map((b) => (b.id === data.book.id ? { ...b, ...data.book } : b)));
      setEditing(false);
      setManageId(null);
      showToast("已保存");
      router.refresh();
    } finally {
      setSavingMeta(false);
    }
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

  function openCreate() {
    setCreating(true);
    setNewTitle("");
    setNewAuthor("");
    setNewText("");
    setNewFormat("md");
  }

  async function createFromText() {
    const text = newText.trim();
    if (!text) {
      showToast("正文不能为空");
      return;
    }
    const title = newTitle.trim() || "未命名书籍";
    setCreatingBusy(true);
    try {
      // 包装成 File 走现有导入管线（章节解析/字数统计/封面全复用）
      const file = new File([text], `${title}.${newFormat}`, {
        type: newFormat === "md" ? "text/markdown" : "text/plain",
      });
      const form = new FormData();
      form.append("file", file);
      form.append("title", title);
      const author = newAuthor.trim();
      if (author) form.append("author", author);
      const res = await fetch("/api/books", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "创建失败");
        return;
      }
      setCreating(false);
      const list = await fetch("/api/books").then((r) => r.json());
      setBooks(list.books);
      router.refresh();
      showToast(`已创建《${data.book.title}》`);
    } finally {
      setCreatingBusy(false);
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
            <h1 className="text-3xl font-bold tracking-wide text-[#f0e9dc]" style={{ fontFamily: titleFont }}>墨阅</h1>
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
                <Cover book={b} titleSize={coverTitleSize} titleFont={titleFont} />
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

          {/* 粘贴新建卡片 */}
          <button
            onClick={openCreate}
            className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/12 bg-white/[0.03] text-zinc-500 transition hover:border-emerald-500/40 hover:text-emerald-300 active:scale-95"
          >
            <ClipboardPen size={22} />
            <span className="text-xs">新建小说</span>
            <span className="text-[10px] text-zinc-600">粘贴文本</span>
          </button>

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
          <h2 className="mt-6 text-xl font-bold text-zinc-200" style={{ fontFamily: titleFont }}>书架还空着</h2>
          <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-zinc-500">
            导入你的 Markdown / TXT 小说，或先试试内置示例书体验完整功能
          </p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={openCreate}
              disabled={importing}
              className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-2.5 text-sm text-emerald-300 transition active:scale-95"
            >
              <ClipboardPen size={16} />
              新建小说
            </button>
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
          onClick={() => {
            setManageId(null);
            setEditing(false);
          }}
        >
          <div
            className="anim-sheet w-full max-w-md rounded-t-3xl border-t border-white/10 bg-zinc-900 p-5 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {editing ? (
              /* ===== 编辑表单 ===== */
              <div className="mb-4 space-y-3">
              <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-bold text-zinc-100" style={{ fontFamily: titleFont }}>编辑书籍信息</h3>
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-full p-1.5 text-zinc-500 active:bg-white/10"
                    aria-label="取消编辑"
                  >
                    <X size={16} />
                  </button>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-zinc-500">书名</span>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={80}
                    autoFocus
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
                    placeholder="输入书名"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-zinc-500">作者</span>
                  <input
                    value={editAuthor}
                    onChange={(e) => setEditAuthor(e.target.value)}
                    maxLength={40}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
                    placeholder="未知作者"
                  />
                </label>
                <button
                  onClick={saveMeta}
                  disabled={savingMeta}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 py-3 text-sm font-semibold text-black transition active:scale-95 disabled:opacity-50"
                >
                  {savingMeta ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  保存
                </button>
              </div>
            ) : (
              /* ===== 信息头 ===== */
              <div className="mb-4 flex items-start gap-3">
                <div className="w-12 shrink-0">
                  <Cover book={managed} titleSize={11} titleFont={titleFont} />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <h3 className="truncate font-bold text-zinc-100" style={{ fontFamily: titleFont }}>{managed.title}</h3>
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
            )}
            {!editing && (
              <>
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
                <button
                  onClick={startEdit}
                  className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white/5 px-4 py-3.5 text-sm text-zinc-200 transition active:bg-white/10"
                >
                  <PenLine size={17} className="text-emerald-400" />
                  编辑书名 / 作者
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
              </>
            )}
          </div>
        </div>
      )}

      {/* 粘贴新建弹层 */}
      {creating && (
        <div
          className="anim-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !creatingBusy && setCreating(false)}
        >
          <div
            className="anim-sheet flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h3 className="flex items-center gap-2 font-bold text-zinc-100">
                <ClipboardPen size={16} className="text-emerald-400" />
                新建小说
              </h3>
              <button
                onClick={() => setCreating(false)}
                disabled={creatingBusy}
                className="rounded-full p-1.5 text-zinc-500 active:bg-white/10"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-5 no-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-zinc-500">书名</span>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={80}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
                    placeholder="未命名书籍"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-zinc-500">作者（可选）</span>
                  <input
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    maxLength={40}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
                    placeholder="未知作者"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
                  {(["md", "txt"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setNewFormat(f)}
                      className={`rounded-lg px-3 py-1.5 text-xs transition ${
                        newFormat === f ? "bg-emerald-500/20 font-semibold text-emerald-300" : "text-zinc-500"
                      }`}
                    >
                      {f === "md" ? "MD 标题切章" : "TXT 正则切章"}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] tabular-nums text-zinc-600">
                  {newText.length > 0 ? `${newText.length} 字` : ""}
                </span>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] text-zinc-500">正文</span>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  rows={10}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
                  placeholder={
                    newFormat === "md"
                      ? "粘贴 Markdown 正文…\n\n用 # 标题分章，例：\n# 第一章 初遇"
                      : "粘贴纯文本正文…\n\n用「第X章」独立行分章"
                  }
                />
              </label>

              <p className="text-[10px] leading-relaxed text-zinc-600">
                {newFormat === "md"
                  ? "按 # / ## 标题切分章节；无标题则整本作为一章"
                  : "按「第X章 / Chapter N / 楔子」等独立行切分章节；超长章自动分块"}
              </p>

              <button
                onClick={createFromText}
                disabled={creatingBusy || !newText.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 py-3 text-sm font-semibold text-black transition active:scale-95 disabled:opacity-40"
              >
                {creatingBusy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                创建并加入书架
              </button>
            </div>
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
