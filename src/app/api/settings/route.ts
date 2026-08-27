import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/types";

/** GET /api/settings —— 返回合并默认值后的设置 */
export async function GET() {
  const rows = await db.select().from(settings).limit(1);
  const data = rows.length > 0 ? (rows[0].data as Record<string, unknown>) : {};
  return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...data } });
}

/** PUT /api/settings —— 整体保存 */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const merged = { ...DEFAULT_SETTINGS, ...(body as Record<string, unknown>) };
  const rows = await db.select().from(settings).limit(1);
  if (rows.length > 0) {
    await db.update(settings).set({ data: merged, updatedAt: new Date() }).returning();
  } else {
    await db.insert(settings).values({ data: merged });
  }
  return NextResponse.json({ settings: merged });
}
