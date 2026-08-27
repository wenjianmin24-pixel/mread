import { NextResponse } from "next/server";
import { db } from "@/db";
import { books, chapters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseChapters, countWords } from "@/lib/parser";
import { SAMPLE_BOOK_TITLE, SAMPLE_BOOK_AUTHOR, SAMPLE_BOOK_CONTENT } from "@/lib/sample";

/** POST /api/books/sample —— 生成内置示例书（幂等） */
export async function POST() {
  const existing = await db.select().from(books).where(eq(books.title, SAMPLE_BOOK_TITLE));
  if (existing.length > 0) {
    return NextResponse.json({ book: existing[0], existed: true });
  }
  const parsed = parseChapters(SAMPLE_BOOK_CONTENT, "md");
  const wordCount = parsed.reduce((s, c) => s + countWords(c.content), 0);

  const [book] = await db
    .insert(books)
    .values({
      title: SAMPLE_BOOK_TITLE,
      author: SAMPLE_BOOK_AUTHOR,
      format: "md",
      coverHue: 216,
      wordCount,
      chapterCount: parsed.length,
    })
    .returning();

  await db.insert(chapters).values(
    parsed.map((c, i) => ({
      bookId: book.id,
      title: c.title,
      content: c.content,
      orderIndex: i,
      wordCount: countWords(c.content),
    }))
  );

  return NextResponse.json({ book, existed: false });
}
