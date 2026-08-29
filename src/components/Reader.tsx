"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { marked } from "marked";
import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  MoonStar,
  Pause,
  Play,
  Type as TypeIcon,
  Wand2,
  Eraser,
  X,
  Check,
} from "lucide-react";
import { highlightDialogue } from "@/lib/dialogue";
import {
  BOXMOCHA_RAINBOW,
  DEFAULT_SETTINGS,
  FONT_STACKS,
  RAINBOW_COLORS,
  THEME_PRESETS,
  type ChapterMeta,
  type ReaderSettings,
} from "@/lib/types";
import ReaderSettingsPanel from "./ReaderSettingsPanel";
import ChapterDrawer, { type BookmarkRow } from "./ChapterDrawer";

interface BookData {
  id: number;
  title: string;
  format: string;
}

/** 拆分章节标题："第十二章 雨夜来客" → { no: "第十二章", rest: "雨夜来客" } */
function splitChapterTitle(title: string): { no: string | null; rest: string } {
  const m = title.match(/^(第[0-9零一二三四五六七八九十百千万两]+[章节卷回部集篇])(（\d+\/\d+）)?[ \u3000]*(.*)$/);
  if (m) {
    const noWithPart = m[2] ? `${m[1]} ${m[2]}` : m[1];
    if (m[4]) return { no: noWithPart, rest: m[4] };
    return { no: null, rest: noWithPart };
  }
  const c = title.match(/^(Chapter\s+\d+)(（\d+\/\d+）)?[:.\s\u3000]*(.*)$/i);
  if (c) {
    const noWithPart = c[2] ? `${c[1]} ${c[2]}` : c[1];
    if (c[3]) return { no: noWithPart, rest: c[3] };
    return { no: null, rest: noWithPart };
  }
  return { no: null, rest: title };
}

/** 书感章头：章节号小字 + 装饰线 + 标题大字，章首淡入 */
function ChapterHead({
  title,
  fontFamily,
  fontSize,
  sub,
}: {
  title: string;
  fontFamily: string;
  fontSize: number;
  sub: string;
}) {
  const { no, rest } = splitChapterTitle(title);
  return (
    <div className="chapter-head chapter-enter mb-10 text-center">
      {no ? (
        <>
          <p
            className="mb-1.5 tracking-[0.45em]"
            style={{ color: sub, fontFamily, fontSize: Math.max(11, Math.round(fontSize * 0.62)) }}
          >
            {no}
          </p>
          <span className="ch-deco" style={{ background: `linear-gradient(90deg, transparent, ${sub}, transparent)` }} />
          <h1
            className="mt-4 font-bold"
            style={{ fontSize: Math.round(fontSize * 1.32), fontFamily, lineHeight: 1.5 }}
          >
            {rest}
          </h1>
        </>
      ) : (
        <>
          <p className="mb-2.5" style={{ color: sub, fontFamily, fontSize: 9 }}>
            ◆
          </p>
          <h1
            className="font-bold"
            style={{ fontSize: Math.round(fontSize * 1.32), fontFamily, lineHeight: 1.5 }}
          >
            {rest}
          </h1>
        </>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitize(html: string) {
  return html
    .replace(/<(script|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

/** 语义着色：从标注短语中识别颜色词，锚点/燃点呈现对应色彩（CSS 端按亮/暗主题各有一套色值） */
const COLOR_FAMILIES: [RegExp, string][] = [
  [/粉|桃色|樱/, "pink"],
  [/橙|橘|琥珀/, "orange"],
  [/金|鎏/, "gold"],
  [/银/, "silver"],
  [/翠绿|绿|翡翠/, "green"],
  [/青|碧|薄荷/, "cyan"],
  [/蓝|靛/, "blue"],
  [/紫|藕色/, "purple"],
  [/红|绯|茜|赤|朱/, "red"],
  [/棕|褐|咖|茶色/, "brown"],
  [/白|雪|霜/, "white"],
  [/黑|墨|乌/, "black"],
  [/灰/, "gray"],
];

function colorClassOf(text: string, prefix: string): string {
  for (const [re, name] of COLOR_FAMILIES) {
    if (re.test(text)) return ` ${prefix}-${name}`;
  }
  return "";
}

function renderChapter(content: string, format: string): string {
  if (format === "md") {
    // 三级标记体系：==燃点== 预处理为 <mark class="heat">
    // （在转义后、marked 解析前替换，行内安全）
    const pre = content.replace(
      /==([^=\n]{1,120}?)==/g,
      (_m, t: string) => `<mark class="heat${colorClassOf(t, "ht")}">${t}</mark>`
    );
    // marked 按 CommonMark 解析强调，但中文标点紧邻星号时会被判定不成对
    // （如 *林晚愣住了。*这），产出字面星号。行内 ** 与 * 先行自行转换。
    const inline = pre
      .replace(/\*\*([^*\n]{1,300}?)\*\*/g, (_m, t: string) => `<strong class="anc${colorClassOf(t, "anc")}">${t}</strong>`)
      .replace(/\*([^*\n]{1,300}?)\*/g, "<em>$1</em>");
    return sanitize(
      marked.parse(inline, { async: false, gfm: true, breaks: false }) as string
    );
  }
  return content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p>${escapeHtml(l)}</p>`)
    .join("\n");
}

export default function Reader({ bookId }: { bookId: number }) {
  const router = useRouter();
  const [book, setBook] = useState<BookData | null>(null);
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [html, setHtml] = useState("");
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [uiVisible, setUiVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [progressInfo, setProgressInfo] = useState({ ratio: 0, page: 1, pages: 1 });
  const [markedBook, setMarkedBook] = useState(false);
  const [autoScrollOn, setAutoScrollOn] = useState(false);
  const [systemDark, setSystemDark] = useState(false);

  // AI 强化 / 净化
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeMode, setOptimizeMode] = useState<"enhance" | "cleanup">("enhance");
  const [optimizePreview, setOptimizePreview] = useState<string | null>(null);
  const [optimizeError, setOptimizeError] = useState("");
  const [applying, setApplying] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null); // paged 模式滚动容器
  const scrollRef = useRef<HTMLDivElement>(null); // scroll 模式滚动容器
  const restoreRef = useRef<{ ratio: number | null; pending: boolean }>({ ratio: null, pending: false });
  const initProgRef = useRef<{ chapterId: number; scrollRatio: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ratioRef = useRef(0);
  const currentIdRef = useRef<number | null>(null);
  const pagedRef = useRef(false);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  currentIdRef.current = currentId;
  pagedRef.current = settings.pageMode === "paged";

  /* ---------- 跟随系统深浅色 ---------- */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const effectiveThemeId = settings.followSystem
    ? systemDark
      ? settings.nightTheme
      : settings.dayTheme
    : settings.theme;

  const theme =
    THEME_PRESETS.find((t) => t.id === effectiveThemeId) ?? THEME_PRESETS[0];
  const bg = theme.id === "custom" ? settings.customBg : theme.bg;
  const fg = theme.id === "custom" ? settings.customFg : theme.fg;
  const sub = theme.sub;
  const ui = theme.ui;

  const fontFamily = settings.fontFamily.startsWith("custom:")
    ? `"custom-font-${settings.fontFamily.split(":")[1]}"`
    : FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.serif;

  /* ---------- 初始加载 ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [bookRes, setRes, fontRes, markRes] = await Promise.all([
          fetch(`/api/books/${bookId}`),
          fetch("/api/settings"),
          fetch("/api/fonts"),
          fetch(`/api/bookmarks?bookId=${bookId}`),
        ]);
        const bookData = await bookRes.json();
        const setData = await setRes.json();
        const fontData = await fontRes.json();
        const markData = await markRes.json();

        if (!bookRes.ok) {
          router.replace("/");
          return;
        }
        setSettings({ ...DEFAULT_SETTINGS, ...setData.settings });
        setBookmarks(markData.bookmarks ?? []);

        // 注入自定义字体
        if (fontData.fonts?.length) {
          const style = document.createElement("style");
          style.id = "custom-fonts";
          style.textContent = fontData.fonts
            .map((f: { id: number; mime: string }) =>
              `@font-face{font-family:"custom-font-${f.id}";src:url("/api/fonts/${f.id}/file");font-display:swap;}`
            )
            .join("\n");
          document.head.appendChild(style);
        }

        setBook(bookData.book);
        setChapters(bookData.chapters);
        if (bookData.progress) {
          initProgRef.current = {
            chapterId: bookData.progress.chapterId,
            scrollRatio: bookData.progress.scrollRatio,
          };
          setCurrentId(bookData.progress.chapterId);
        } else if (bookData.chapters.length > 0) {
          setCurrentId(bookData.chapters[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  /* ---------- 章节内容加载 ---------- */
  useEffect(() => {
    if (currentId == null) return;
    let cancelled = false;
    setChapterLoading(true);
    fetch(`/api/chapters/${currentId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.chapter) return;
        // 决定恢复位置：同一章用记忆进度，否则回到开头
        const init = initProgRef.current;
        restoreRef.current = {
          ratio: init && init.chapterId === currentId ? init.scrollRatio : 0,
          pending: true,
        };
        initProgRef.current = null;
        setHtml(renderChapter(d.chapter.content, book?.format ?? "txt"));
        setMarkedBook(false);
        setChapterLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, book?.format]);

  /* ---------- HTML 注入后：对话高亮 + 恢复位置 ---------- */
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || !html) return;
    el.innerHTML = html;
    if (settings.dialogueEnabled) {
      highlightDialogue(el, {
        rainbow: settings.dialogueRainbow,
        bold: settings.dialogueBold,
        mood: settings.moodStyling,
      });
    }
    // 恢复滚动位置
    const r = restoreRef.current;
    if (r.pending && r.ratio != null) {
      r.pending = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => applyRatio(r.ratio ?? 0));
      });
    }
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, settings.dialogueEnabled, settings.dialogueRainbow, settings.dialogueBold, settings.moodStyling, settings.fontSize, settings.lineHeight, settings.letterSpacing, settings.paragraphSpacing, settings.sidePadding, settings.pageMode, settings.firstLineIndent, settings.fontFamily]);

  /* ---------- 分页模式列宽 ---------- */
  useLayoutEffect(() => {
    if (settings.pageMode !== "paged") return;
    const vp = viewportRef.current;
    const el = contentRef.current;
    if (!vp || !el) return;
    const colWidth = vp.clientWidth - settings.sidePadding * 2;
    el.style.columnWidth = `${colWidth}px`;
    el.style.columnGap = `${settings.sidePadding * 2}px`;
    requestAnimationFrame(() => {
      if (restoreRef.current.pending && restoreRef.current.ratio != null) {
        restoreRef.current.pending = false;
        applyRatio(restoreRef.current.ratio);
      }
      measure();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, settings.pageMode, settings.sidePadding, settings.fontSize, settings.lineHeight, uiVisible]);

  /* ---------- 设置持久化（防抖） ---------- */
  useEffect(() => {
    if (loading) return;
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      }).catch(() => {});
    }, 600);
    return () => {
      if (settingsTimer.current) clearTimeout(settingsTimer.current);
    };
  }, [settings, loading]);

  /* ---------- 屏幕常亮 ---------- */
  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
        if (settings.keepAwake && nav.wakeLock) {
          const lock = await nav.wakeLock.request("screen");
          if (!cancelled) wakeLockRef.current = lock;
        }
      } catch {
        /* 不支持则忽略 */
      }
    }
    acquire();
    return () => {
      cancelled = true;
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [settings.keepAwake]);

  /* ---------- 进度测量与保存 ---------- */
  const applyRatio = useCallback((ratio: number) => {
    if (pagedRef.current) {
      const vp = viewportRef.current;
      if (!vp) return;
      const max = vp.scrollWidth - vp.clientWidth;
      vp.scrollLeft = ratio * Math.max(max, 0);
    } else {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTop = ratio * Math.max(max, 0);
    }
  }, []);

  const measure = useCallback(() => {
    let ratio = 0;
    let page = 1;
    let pages = 1;
    if (pagedRef.current) {
      const vp = viewportRef.current;
      if (vp) {
        const cw = vp.clientWidth || 1;
        const max = Math.max(vp.scrollWidth - cw, 1);
        ratio = Math.min(1, Math.max(0, vp.scrollLeft / max));
        pages = Math.max(1, Math.round(max / cw) + 1);
        page = Math.min(pages, Math.round(vp.scrollLeft / cw) + 1);
      }
    } else {
      const el = scrollRef.current;
      if (el) {
        const max = Math.max(el.scrollHeight - el.clientHeight, 1);
        ratio = Math.min(1, Math.max(0, el.scrollTop / max));
        const content = contentRef.current;
        if (content) {
          const textLen = content.innerText.length || 1;
          const per = Math.max(1, Math.round(textLen / 900));
          pages = per;
          page = Math.min(per, Math.floor(ratio * per) + 1);
        }
      }
    }
    ratioRef.current = ratio;
    setProgressInfo({ ratio, page, pages });

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const cid = currentIdRef.current;
      if (cid == null) return;
      fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId: cid, scrollRatio: ratio }),
      }).catch(() => {});
    }, 800);
  }, [bookId]);

  /* ---------- 滚动监听 ---------- */
  useEffect(() => {
    if (loading) return;
    const target: (Window | HTMLElement) =
      settings.pageMode === "paged" && viewportRef.current
        ? viewportRef.current
        : (scrollRef.current ?? window);
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        measure();
        ticking = false;
      });
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [loading, settings.pageMode, measure, html]);

  /* ---------- 自动滚屏 ---------- */
  useEffect(() => {
    if (settings.pageMode !== "scroll") setAutoScrollOn(false);
  }, [settings.pageMode]);

  useEffect(() => {
    if (!autoScrollOn || settings.pageMode !== "scroll") return;
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    let last = performance.now();
    const step = (ts: number) => {
      const dt = ts - last;
      last = ts;
      el.scrollTop += (settings.autoScrollSpeed * dt) / 1000;
      if (el.scrollTop >= el.scrollHeight - el.clientHeight - 1) {
        setAutoScrollOn(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [autoScrollOn, settings.autoScrollSpeed, settings.pageMode, currentId]);

  /* ---------- 导航 ---------- */
  const currentIdx = chapters.findIndex((c) => c.id === currentId);

  const goChapter = useCallback(
    (id: number, ratio = 0) => {
      initProgRef.current = ratio > 0 ? { chapterId: id, scrollRatio: ratio } : null;
      setCurrentId(id);
      setUiVisible(false);
      setDrawerOpen(false);
    },
    []
  );

  const nextPage = useCallback(() => {
    if (pagedRef.current) {
      const vp = viewportRef.current;
      if (!vp) return;
      const atEnd = vp.scrollLeft >= vp.scrollWidth - vp.clientWidth - 8;
      if (atEnd) {
        if (currentIdx < chapters.length - 1) goChapter(chapters[currentIdx + 1].id);
      } else {
        vp.scrollBy({ left: vp.clientWidth, behavior: "smooth" });
      }
    } else {
      const el = scrollRef.current;
      if (!el) return;
      const nearBottom = el.scrollTop >= el.scrollHeight - el.clientHeight - 8;
      if (nearBottom) {
        if (currentIdx < chapters.length - 1) goChapter(chapters[currentIdx + 1].id);
      } else {
        el.scrollBy({ top: el.clientHeight * 0.92, behavior: "smooth" });
      }
    }
  }, [chapters, currentIdx, goChapter]);

  const prevPage = useCallback(() => {
    if (pagedRef.current) {
      const vp = viewportRef.current;
      if (!vp) return;
      if (vp.scrollLeft <= 8) {
        if (currentIdx > 0) goChapter(chapters[currentIdx - 1].id);
      } else {
        vp.scrollBy({ left: -vp.clientWidth, behavior: "smooth" });
      }
    } else {
      const el = scrollRef.current;
      if (!el) return;
      if (el.scrollTop <= 8) {
        if (currentIdx > 0) goChapter(chapters[currentIdx - 1].id);
      } else {
        el.scrollBy({ top: -el.clientHeight * 0.92, behavior: "smooth" });
      }
    }
  }, [chapters, currentIdx, goChapter]);

  const onTapZone = (e: React.MouseEvent) => {
    if (autoScrollOn) {
      setAutoScrollOn(false);
      return;
    }
    if (panelOpen || drawerOpen) return;
    const x = e.clientX / window.innerWidth;
    if (x < 0.28) prevPage();
    else if (x > 0.72) nextPage();
    else setUiVisible((v) => !v);
  };

  /* ---------- AI 强化 / 去除八股 ---------- */
  async function startOptimize(mode: "enhance" | "cleanup") {
    if (currentId == null) return;
    setOptimizeMode(mode);
    setOptimizeError("");
    setOptimizing(true);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: currentId, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOptimizeError(data.error || "强化失败");
        return;
      }
      setOptimizePreview(data.enhanced);
    } catch {
      setOptimizeError("请求异常，请检查网络和 API 配置");
    } finally {
      setOptimizing(false);
    }
  }

  async function applyOptimize() {
    if (currentId == null || !optimizePreview) return;
    setApplying(true);
    try {
      await fetch(`/api/chapters/${currentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: optimizePreview }),
      });
      // 重新渲染本章
      setHtml(renderChapter(optimizePreview, book?.format ?? "txt"));
      setOptimizePreview(null);
    } catch {
      setOptimizeError("应用失败，请重试");
    } finally {
      setApplying(false);
    }
  }

  /* ---------- 书签 ---------- */
  async function toggleBookmark() {
    if (currentId == null) return;
    const el = contentRef.current;
    const text = el?.innerText ?? "";
    const pos = Math.floor(text.length * ratioRef.current);
    const excerpt = text.slice(pos, pos + 60).replace(/\s+/g, " ").trim();
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, chapterId: currentId, scrollRatio: ratioRef.current, excerpt }),
    });
    const data = await res.json();
    if (data.bookmark) {
      setBookmarks((bs) => [data.bookmark, ...bs]);
      setMarkedBook(true);
      setTimeout(() => setMarkedBook(false), 1600);
    }
  }

  async function deleteBookmark(id: number) {
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    setBookmarks((bs) => bs.filter((b) => b.id !== id));
  }

  /* ---------- 渲染 ---------- */
  if (loading) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3" style={{ background: DEFAULT_SETTINGS.theme === "paper" ? "#f6f3ec" : "#f6f3ec", color: "#8a8478" }}>
        <Loader2 className="animate-spin" size={26} />
        <p className="text-sm">正在翻开书页…</p>
      </div>
    );
  }

  const rainbowPalette = theme.id === "boxmocha" ? BOXMOCHA_RAINBOW : RAINBOW_COLORS;

  const dlgVars = {
    "--dlg-color": settings.dialogueColor,
    "--dlg-c0": rainbowPalette[0],
    "--dlg-c1": rainbowPalette[1],
    "--dlg-c2": rainbowPalette[2],
    "--dlg-c3": rainbowPalette[3],
    "--dlg-c4": rainbowPalette[4],
    "--dlg-c5": rainbowPalette[5],
  } as React.CSSProperties;

  const textStyle: React.CSSProperties = {
    fontFamily,
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    letterSpacing: settings.letterSpacing > 0 ? settings.letterSpacing : undefined,
    ["--para-gap" as string]: `${settings.paragraphSpacing}em`,
  };

  const currentChapter = chapters[currentIdx];

  return (
    <div
      className={`h-dvh w-full overflow-hidden ${
        theme.id === "boxmocha" ? "theme-boxmocha" : ""
      } spice-${settings.spiceStyle}${settings.spicePulse ? " spice-pulse" : ""}${
        theme.dark ? " theme-dark-scope" : ""
      }`}
      style={{
        background: bg,
        color: fg,
        ["--spice-lv" as string]: Math.max(0.1, settings.spiceIntensity / 100),
        ...dlgVars,
      }}
    >
      {/* ===== 内容区 ===== */}
      {settings.pageMode === "scroll" ? (
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto no-scrollbar"
          onClick={onTapZone}
          onTouchStart={() => {
            if (autoScrollOn) setAutoScrollOn(false);
          }}
          onWheel={() => {
            if (autoScrollOn) setAutoScrollOn(false);
          }}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div
            className="mx-auto min-h-full"
            style={{
              maxWidth:
                theme.id === "boxmocha"
                  ? undefined
                  : `calc(48rem * ${settings.contentWidth / 100})`,
              paddingLeft: settings.sidePadding,
              paddingRight: settings.sidePadding,
              paddingTop: "max(3.5rem, env(safe-area-inset-top))",
              paddingBottom: "45dvh",
            }}
          >
            {currentChapter && (
              <ChapterHead
                title={currentChapter.title}
                fontFamily={fontFamily}
                fontSize={settings.fontSize}
                sub={sub}
              />
            )}
            <div
              ref={contentRef}
              className={`reader-content ${settings.firstLineIndent ? "indent" : ""}`}
              style={textStyle}
            />
            {currentIdx === chapters.length - 1 && html && (
              <p className="mt-16 text-center text-xs tracking-[0.4em]" style={{ color: sub }}>
                · 全书完 ·
              </p>
            )}
          </div>
        </div>
      ) : (
        <div ref={viewportRef} className="paged-viewport h-full w-full" onClick={onTapZone}>
          <div
            ref={contentRef}
            className={`reader-content paged-columns ${settings.firstLineIndent ? "indent" : ""}`}
            style={{
              ...textStyle,
              paddingTop: "max(3.5rem, env(safe-area-inset-top))",
              paddingBottom: "4.5rem",
              paddingLeft: settings.sidePadding,
              paddingRight: settings.sidePadding,
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* 章节加载指示 */}
      {chapterLoading && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center" style={{ background: bg }}>
          <Loader2 className="animate-spin" size={24} style={{ color: sub }} />
        </div>
      )}

      {/* 亮度遮罩 */}
      {settings.brightness < 1 && (
        <div
          className="pointer-events-none fixed inset-0 z-30 bg-black"
          style={{ opacity: 1 - settings.brightness }}
        />
      )}

      {/* ===== 顶部工具栏 ===== */}
      <header
        className="fixed inset-x-0 top-0 z-40 transition-transform duration-300"
        style={{
          transform: uiVisible ? "translateY(0)" : "translateY(-110%)",
          background: ui,
          color: fg,
          paddingTop: "env(safe-area-inset-top)",
          boxShadow: "0 1px 0 rgba(0,0,0,0.08), 0 8px 24px -12px rgba(0,0,0,0.25)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
          <button
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 active:bg-black/10"
            aria-label="返回书架"
          >
            <ArrowLeft size={19} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{book?.title}</p>
            <p className="truncate text-[11px]" style={{ color: sub }}>
              {currentChapter?.title ?? ""}
            </p>
          </div>
          <button
            onClick={toggleBookmark}
            className="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 active:bg-black/10"
            aria-label="添加书签"
          >
            <BookmarkIcon size={18} fill={markedBook ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 active:bg-black/10"
            aria-label="目录"
          >
            <List size={19} />
          </button>
        </div>
      </header>

      {/* ===== 底部工具栏 ===== */}
      <footer
        className="fixed inset-x-0 bottom-0 z-40 transition-transform duration-300"
        style={{
          transform: uiVisible ? "translateY(0)" : "translateY(110%)",
          background: ui,
          color: fg,
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -1px 0 rgba(0,0,0,0.08), 0 -8px 24px -12px rgba(0,0,0,0.25)",
        }}
      >
        <div className="mx-auto max-w-3xl px-5 pb-3 pt-3">
          <div className="mb-2.5 flex items-center justify-between text-[11px]" style={{ color: sub }}>
            <span>
              第 {currentIdx + 1}/{chapters.length} 章
              {settings.pageMode === "paged" && ` · ${progressInfo.page}/${progressInfo.pages} 页`}
            </span>
            <span className="tabular-nums">{Math.round(progressInfo.ratio * 100)}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,0.12)" }}>
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{ width: `${progressInfo.ratio * 100}%`, background: fg }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => currentIdx > 0 && goChapter(chapters[currentIdx - 1].id)}
              disabled={currentIdx <= 0}
              className="flex items-center gap-1 rounded-full px-3 py-2 text-xs transition active:scale-95 disabled:opacity-30"
            >
              <ChevronLeft size={15} />
              上一章
            </button>
            <div className="flex items-center gap-2.5">
              {settings.pageMode === "scroll" && (
                <button
                  onClick={() => setAutoScrollOn((v) => !v)}
                  className="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95"
                  style={
                    autoScrollOn
                      ? { background: fg, color: ui, boxShadow: "0 4px 14px -4px rgba(0,0,0,0.4)" }
                      : { background: "rgba(0,0,0,0.08)" }
                  }
                  aria-label={autoScrollOn ? "暂停自动滚屏" : "自动滚屏"}
                >
                  {autoScrollOn ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                </button>
              )}
              <button
                onClick={() => setPanelOpen(true)}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold shadow-lg transition active:scale-95"
                style={{ background: fg, color: ui }}
              >
                <TypeIcon size={14} />
                阅读设置
              </button>
            </div>
            <button
              onClick={() => currentIdx < chapters.length - 1 && goChapter(chapters[currentIdx + 1].id)}
              disabled={currentIdx >= chapters.length - 1}
              className="flex items-center gap-1 rounded-full px-3 py-2 text-xs transition active:scale-95 disabled:opacity-30"
            >
              下一章
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </footer>

      {/* ===== 常显底部进度（UI 隐藏时） ===== */}
      {settings.showFooter && !uiVisible && !panelOpen && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex items-center justify-between px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 text-[10px] tabular-nums"
          style={{ color: sub }}
        >
          <span className="truncate">{currentChapter?.title}</span>
          <span>{Math.round(progressInfo.ratio * 100)}%</span>
        </div>
      )}

      {/* ===== 目录抽屉 ===== */}
      {drawerOpen && book && (
        <ChapterDrawer
          bookTitle={book.title}
          chapters={chapters}
          currentId={currentId}
          bookmarks={bookmarks}
          fg={fg}
          sub={sub}
          ui={ui}
          onClose={() => setDrawerOpen(false)}
          onJump={(id) => goChapter(id)}
          onJumpBookmark={(b) => {
            goChapter(b.chapterId, b.scrollRatio);
          }}
          onDeleteBookmark={deleteBookmark}
        />
      )}

      {/* ===== 设置面板 ===== */}
      {panelOpen && (
        <div className="anim-fade-in fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={() => setPanelOpen(false)}>
          <div
            className="anim-sheet absolute inset-x-0 bottom-0 mx-auto max-w-3xl rounded-t-3xl pt-3"
            style={{ background: ui, color: fg, paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full" style={{ background: sub, opacity: 0.4 }} />
            <div className="flex items-center justify-between px-5 pb-1">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <MoonStar size={15} />
                阅读设置
              </h3>
              <button
                onClick={() => setPanelOpen(false)}
                className="rounded-full px-3 py-1 text-xs transition active:scale-95"
                style={{ background: "rgba(0,0,0,0.08)" }}
              >
                完成
              </button>
            </div>
            <ReaderSettingsPanel settings={settings} onChange={setSettings} />

            {/* AI 按钮：强化 / 净化并列 */}
            {currentId != null && (
              <div className="flex gap-2 px-5 pb-2 pt-1">
                <button
                  onClick={() => startOptimize("enhance")}
                  disabled={optimizing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-black/8 bg-black/[0.03] py-3 text-sm transition active:scale-95 disabled:opacity-50"
                  style={{ color: fg }}
                >
                  {optimizing && optimizeMode === "enhance" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Wand2 size={15} />
                  )}
                  AI 强化本章
                </button>
                <button
                  onClick={() => startOptimize("cleanup")}
                  disabled={optimizing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-black/8 bg-black/[0.03] py-3 text-sm transition active:scale-95 disabled:opacity-50"
                  style={{ color: fg }}
                >
                  {optimizing && optimizeMode === "cleanup" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Eraser size={15} />
                  )}
                  去除 AI 八股
                </button>
                {optimizeError && (
                  <p className="mt-1.5 w-full text-center text-[10px] text-red-500">
                    {optimizeError}
                  </p>
                )}
                {optimizing && (
                  <p className="mt-1.5 w-full text-center text-[10px] opacity-50">
                    正在调用 AI，请稍候…
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI 强化预览 */}
      {optimizePreview && (
        <div
          className="anim-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !applying && setOptimizePreview(null)}
        >
          <div
            className="anim-sheet flex max-h-[85dvh] w-full max-w-3xl flex-col rounded-t-3xl"
            style={{ background: ui, color: fg, paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                {optimizeMode === "cleanup" ? <Eraser size={15} /> : <Wand2 size={15} />}
                {optimizeMode === "cleanup" ? "净化预览 · 去除 AI 八股" : "AI 强化预览"}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOptimizePreview(null)}
                  disabled={applying}
                  className="rounded-full px-3 py-1 text-xs transition active:scale-95"
                  style={{ background: "rgba(0,0,0,0.08)" }}
                >
                  取消
                </button>
                <button
                  onClick={applyOptimize}
                  disabled={applying}
                  className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg transition active:scale-95 disabled:opacity-50"
                  style={{ background: fg, color: ui }}
                >
                  {applying ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  应用到本章
                </button>
              </div>
            </div>
            <div className="mx-auto w-full flex-1 overflow-y-auto px-5 pb-8 no-scrollbar">
              <div
                className={`reader-content rounded-xl p-4 text-sm leading-relaxed spice-${settings.spiceStyle}${settings.spicePulse ? " spice-pulse" : ""}`}
                style={{
                  background: "rgba(0,0,0,0.04)",
                  fontFamily,
                  fontSize: settings.fontSize,
                  lineHeight: settings.lineHeight,
                  ["--spice-lv" as string]: Math.max(0.1, settings.spiceIntensity / 100),
                }}
                ref={(el) => {
                  if (el && optimizePreview) {
                    el.innerHTML = renderChapter(optimizePreview, book?.format ?? "md");
                    if (settings.dialogueEnabled) {
                      highlightDialogue(el, {
                        rainbow: settings.dialogueRainbow,
                        bold: settings.dialogueBold,
                        mood: settings.moodStyling,
                      });
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
