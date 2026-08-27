import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fonts } from "@/db/schema";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/fonts/:id */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(fonts).where(eq(fonts.id, Number(id)));
  return NextResponse.json({ ok: true });
}
