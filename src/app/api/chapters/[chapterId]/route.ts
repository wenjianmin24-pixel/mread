import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ chapterId: string }> };

/** GET /api/chapters/:chapterId —— 单章正文 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { chapterId } = await ctx.params;
  const id = Number(chapterId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "无效 ID" }, { status: 400 });
  }
  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
  if (!chapter) return NextResponse.json({ error: "章节不存在" }, { status: 404 });
  return NextResponse.json({ chapter });
}
