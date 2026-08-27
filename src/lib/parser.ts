export interface ParsedChapter {
  title: string;
  content: string;
}

/** 统计字数（中日韩字符按字计，西文按词计） */
export function countWords(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const western = (text.match(/[a-zA-Z0-9]+/g) || []).length;
  return cjk + western;
}

/** 从文件名推断书名与格式 */
export function inferFromFileName(fileName: string): { title: string; format: "md" | "txt" } {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  const ext = (fileName.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
  const format = ext === "md" || ext === "markdown" ? "md" : "txt";
  return { title: base || "未命名书籍", format };
}

/** TXT 章节标题模式：第X章/卷/回/节、Chapter N、楔子/序章/尾声/番外 */
const TXT_CHAPTER_RE =
  /^[ \t]*(第[0-9零一二三四五六七八九十百千万两]+[章节卷回部集篇][^\n]{0,40}|Chapter\s+\d+[^\n]{0,40}|CHAPTER\s+\d+[^\n]{0,40}|楔子|序章|序言|序|终章|尾声|后记|番外篇?[^\n]{0,30})[ \t]*$/;

/** MD 标题模式：# ~ ## 级别视为章节 */
const MD_CHAPTER_RE = /^#{1,2}\s+(.+?)\s*#*\s*$/;

/**
 * 把整本书文本切分为章节。
 * - format = md：按 Markdown 一二级标题切分（标题行保留在正文中渲染）
 * - format = txt：按常见章节标题正则切分
 * - 兜底：无匹配或单章过长时按字数切块
 */
export function parseChapters(raw: string, format: "md" | "txt"): ParsedChapter[] {
  const text = raw.replace(/\r\n?/g, "\n").replace(/﻿/g, "");
  const lines = text.split("\n");

  const heads: { lineIdx: number; title: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (format === "md") {
      const m = line.match(MD_CHAPTER_RE);
      if (m) heads.push({ lineIdx: i, title: m[1].trim() });
    } else {
      const trimmed = line.trim();
      if (trimmed && TXT_CHAPTER_RE.test(trimmed)) {
        heads.push({ lineIdx: i, title: trimmed });
      }
    }
  }

  let chapters: ParsedChapter[] = [];

  if (heads.length === 0) {
    chapters = [{ title: "全文", content: text.trim() }];
  } else {
    // 标题之前的内容（前言/简介）
    const preface = lines.slice(0, heads[0].lineIdx).join("\n").trim();
    if (preface.length > 30) {
      chapters.push({ title: format === "md" ? "卷首" : "开篇", content: preface });
    }
    for (let h = 0; h < heads.length; h++) {
      const start = heads[h].lineIdx;
      const end = h + 1 < heads.length ? heads[h + 1].lineIdx : lines.length;
      // 章节标题行由阅读器 UI 统一渲染，正文中去掉避免重复
      const bodyLines = lines.slice(start + 1, end);
      const content = bodyLines.join("\n").trim();
      chapters.push({ title: heads[h].title, content });
    }
  }

  // 兜底：任何超过 15000 字的章按字数切块，保证移动端渲染流畅
  const MAX = 15000;
  const result: ParsedChapter[] = [];
  for (const ch of chapters) {
    if (ch.content.length <= MAX) {
      if (ch.content.length > 0) result.push(ch);
      continue;
    }
    const parts = Math.ceil(ch.content.length / MAX);
    // 优先在段落边界切分
    const paras = ch.content.split(/\n{2,}/);
    let buf: string[] = [];
    let bufLen = 0;
    let partIdx = 0;
    const flush = () => {
      if (bufLen === 0) return;
      partIdx += 1;
      result.push({
        title: `${ch.title}（${partIdx}/${parts}）`,
        content: buf.join("\n\n").trim(),
      });
      buf = [];
      bufLen = 0;
    };
    for (const p of paras) {
      if (bufLen + p.length > MAX && bufLen > 0) flush();
      buf.push(p);
      bufLen += p.length + 2;
    }
    flush();
  }
  return result.length > 0 ? result : [{ title: "全文", content: "" }];
}
