import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fonts } from "@/db/schema";
import { desc } from "drizzle-orm";

const MIME_BY_EXT: Record<string, string> = {
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

/** GET /api/fonts —— 字体列表（不含文件数据） */
export async function GET() {
  const rows = await db
    .select({
      id: fonts.id,
      name: fonts.name,
      fileName: fonts.fileName,
      mime: fonts.mime,
      createdAt: fonts.createdAt,
    })
    .from(fonts)
    .orderBy(desc(fonts.createdAt));
  return NextResponse.json({ fonts: rows });
}

/** POST /api/fonts —— 上传字体（multipart: file, name?） */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }
    const ext = (file.name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) {
      return NextResponse.json({ error: "仅支持 .ttf / .otf / .woff / .woff2" }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "字体文件过大（限 25MB）" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const name =
      (form.get("name") as string)?.trim() || file.name.replace(/\.[^.]+$/, "") || "自定义字体";

    const [font] = await db
      .insert(fonts)
      .values({ name, fileName: file.name, mime, dataBase64: buf.toString("base64") })
      .returning({ id: fonts.id, name: fonts.name, fileName: fonts.fileName, mime: fonts.mime });

    return NextResponse.json({ font });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "字体上传失败" }, { status: 500 });
  }
}
