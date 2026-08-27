import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

/** GET /api/bookmarks?bookId=1 */
export async function GET(req: NextRequest) {
  const bookId = Number(req.nextUrl.searchParams.get("bookId"));
  if (!Number.isInteger(bookId)) {
    return NextResponse.json({ error: "缺少 bookId" }, { status: 400 });
  }
  const rows = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.bookId, bookId))
    .orderBy(desc(bookmarks.createdAt));
  return NextResponse.json({ bookmarks: rows });
}

/** POST /api/bookmarks —— { bookId, chapterId, scrollRatio, excerpt } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !Number.isInteger(body.bookId) || !Number.isInteger(body.chapterId)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const [mark] = await db
    .insert(bookmarks)
    .values({
      bookId: body.bookId,
      chapterId: body.chapterId,
      scrollRatio: Math.max(0, Math.min(1, Number(body.scrollRatio) || 0)),
      excerpt: String(body.excerpt || "").slice(0, 120),
    })
    .returning();
  return NextResponse.json({ bookmark: mark });
}
