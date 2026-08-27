import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fonts } from "@/db/schema";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/fonts/:id/file —— 字体二进制流（带长缓存） */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const [font] = await db.select().from(fonts).where(eq(fonts.id, Number(id)));
  if (!font) return NextResponse.json({ error: "字体不存在" }, { status: 404 });

  const buf = Buffer.from(font.dataBase64, "base64");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": font.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(buf.length),
    },
  });
}
