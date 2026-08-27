import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { books, chapters, progress } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { parseChapters, countWords, inferFromFileName } from "@/lib/parser";

/** GET /api/books —— 书架列表（含进度） */
export async function GET() {
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

  return NextResponse.json({ books: rows });
}

/** POST /api/books —— 导入书籍（multipart: file） */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }
    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: "文件过大（限 30MB）" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    // 尝试 UTF-8，失败则按 GBK 常见乱码兜底（Node 无 GBK，直接 latin1 提示）
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch {
      try {
        text = new TextDecoder("gb18030").decode(buf);
      } catch {
        text = buf.toString("utf-8");
      }
    }

    const { title, format } = inferFromFileName(file.name);
    const parsed = parseChapters(text, format);
    const wordCount = parsed.reduce((s, c) => s + countWords(c.content), 0);
    const coverHue = Math.floor(Math.random() * 360);

    const [book] = await db
      .insert(books)
      .values({
        title: (form.get("title") as string) || title,
        author: (form.get("author") as string) || "未知作者",
        format,
        coverHue,
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

    return NextResponse.json({ book });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "导入失败，请检查文件格式" }, { status: 500 });
  }
}
