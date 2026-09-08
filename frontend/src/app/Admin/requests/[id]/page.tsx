import { SellRequestDetailClient } from "@/components/admin/SellRequestDetailClient";

export default async function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellRequestDetailClient id={id} />;
}
