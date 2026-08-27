import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { books, chapters, progress, bookmarks } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { countWords } from "@/lib/parser";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/books/:id/merge —— 把全书所有章节合并为一章。
 * 各章标题保留为 Markdown 小节标题（txt 书转为粗体行），正文依序拼接。
 * 合并后旧章节删除，进度与书签重置。
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) {
    return NextResponse.json({ error: "无效 ID" }, { status: 400 });
  }

  const [book] = await db.select().from(books).where(eq(books.id, bookId));
  if (!book) return NextResponse.json({ error: "书籍不存在" }, { status: 404 });

  const rows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(asc(chapters.orderIndex));

  if (rows.length === 0) {
    return NextResponse.json({ error: "无章节可合并" }, { status: 400 });
  }

  // 拼接正文：保留小节标题（md 用 ##，txt 用【】粗体行）
  const useMdHeadings = book.format === "md";
  const parts: string[] = [];
  for (const ch of rows) {
    const heading = useMdHeadings ? `## ${ch.title}` : `【${ch.title}】`;
    parts.push(ch.content.trim() ? `${heading}\n\n${ch.content.trim()}` : heading);
  }
  const content = parts.join("\n\n");

  const wordCount = countWords(content);

  // 事务感保障：先删旧数据，再插入合并章
  await db.delete(chapters).where(eq(chapters.bookId, bookId));
  await db.delete(progress).where(eq(progress.bookId, bookId));
  await db.delete(bookmarks).where(eq(bookmarks.bookId, bookId));

  await db.insert(chapters).values({
    bookId,
    title: "全文",
    content,
    orderIndex: 0,
    wordCount,
  });

  await db
    .update(books)
    .set({ chapterCount: 1, wordCount })
    .where(eq(books.id, bookId));

  return NextResponse.json({ ok: true, chapterCount: 1, wordCount });
}
