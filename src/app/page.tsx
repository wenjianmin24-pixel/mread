import { db } from "@/db";
import { books, progress } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Library from "@/components/Library";
import type { BookMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      format: books.format,
      coverHue: books.coverHue,
      wordCount: books.wordCount,
      chapterCount: books.chapterCount,
      createdAt: books.createdAt,
      lastReadAt: books.lastReadAt,
      progressChapterId: progress.chapterId,
      progressRatio: progress.scrollRatio,
    })
    .from(books)
    .leftJoin(progress, eq(progress.bookId, books.id))
    .orderBy(desc(books.lastReadAt), desc(books.createdAt));

  const metas: BookMeta[] = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    lastReadAt: r.lastReadAt ? r.lastReadAt.toISOString() : null,
  }));

  return <Library initialBooks={metas} />;
}
