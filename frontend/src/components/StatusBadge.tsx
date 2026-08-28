import type { InventoryStatus, Language } from "@/lib/types";
import { statusLabel } from "@/lib/i18n";

export function StatusBadge({ status, language }: { status: InventoryStatus; language: Language }) {
  return <span className={`status status-${status}`}>{statusLabel(language, status)}</span>;
}

