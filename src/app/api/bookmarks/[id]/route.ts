import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/bookmarks/:id */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(bookmarks).where(eq(bookmarks.id, Number(id)));
  return NextResponse.json({ ok: true });
}
