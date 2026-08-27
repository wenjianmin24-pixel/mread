import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { books, progress } from "@/db/schema";
import { eq } from "drizzle-orm";

/** PUT /api/progress —— { bookId, chapterId, scrollRatio } */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !Number.isInteger(body.bookId) || !Number.isInteger(body.chapterId)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const ratio = Math.max(0, Math.min(1, Number(body.scrollRatio) || 0));

  const existing = await db.select().from(progress).where(eq(progress.bookId, body.bookId));
  if (existing.length > 0) {
    await db
      .update(progress)
      .set({ chapterId: body.chapterId, scrollRatio: ratio, updatedAt: new Date() })
      .where(eq(progress.bookId, body.bookId));
  } else {
    await db.insert(progress).values({
      bookId: body.bookId,
      chapterId: body.chapterId,
      scrollRatio: ratio,
    });
  }
  await db.update(books).set({ lastReadAt: new Date() }).where(eq(books.id, body.bookId));
  return NextResponse.json({ ok: true });
}
