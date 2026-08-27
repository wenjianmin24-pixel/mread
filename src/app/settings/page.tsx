import { db } from "@/db";
import { fonts } from "@/db/schema";
import { desc } from "drizzle-orm";
import SettingsPage from "@/components/SettingsPage";

export const dynamic = "force-dynamic";

export interface FontMeta {
  id: number;
  name: string;
  fileName: string;
  mime: string;
}

export default async function Page() {
  const rows = await db
    .select({ id: fonts.id, name: fonts.name, fileName: fonts.fileName, mime: fonts.mime })
    .from(fonts)
    .orderBy(desc(fonts.createdAt));

  return <SettingsPage initialFonts={rows} />;
}
