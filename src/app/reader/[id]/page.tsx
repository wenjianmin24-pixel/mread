import Reader from "@/components/Reader";

export const dynamic = "force-dynamic";

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);
  return <Reader bookId={bookId} />;
}
