import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { books, chapters, progress } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/books/:id —— 书籍详情 + 章节目录（不含正文）+ 进度 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) {
    return NextResponse.json({ error: "无效 ID" }, { status: 400 });
  }

  const [book] = await db.select().from(books).where(eq(books.id, bookId));
  if (!book) return NextResponse.json({ error: "书籍不存在" }, { status: 404 });

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      orderIndex: chapters.orderIndex,
      wordCount: chapters.wordCount,
    })
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(asc(chapters.orderIndex));

  const [prog] = await db.select().from(progress).where(eq(progress.bookId, bookId));

  return NextResponse.json({ book, chapters: chapterRows, progress: prog ?? null });
}

/** DELETE /api/books/:id */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const bookId = Number(id);
  await db.delete(books).where(eq(books.id, bookId));
  return NextResponse.json({ ok: true });
}

/** PATCH /api/books/:id —— 重命名等 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const bookId = Number(id);
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.author === "string") patch.author = body.author.trim() || "未知作者";
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "无可更新字段" }, { status: 400 });
  }
  const [book] = await db.update(books).set(patch).where(eq(books.id, bookId)).returning();
  return NextResponse.json({ book });
}
