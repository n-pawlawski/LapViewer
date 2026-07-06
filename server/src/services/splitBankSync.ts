import {
  removeSplitBankEntryByMarkerId,
  upsertSplitBankEntryForMarker,
} from "../services/splitBank.js";
import { getDb } from "../db/database.js";

export function scheduleSplitBankUpsert(markerId: string, userId: string): void {
  void upsertSplitBankEntryForMarker(markerId, userId).catch((err) => {
    console.warn(`Split bank upsert failed for marker ${markerId}:`, err);
  });
}

export function scheduleSplitBankRemove(markerId: string): void {
  removeSplitBankEntryByMarkerId(markerId);
}

export function scheduleSplitBankRemoveIfSplit(markerId: string): void {
  const row = getDb()
    .prepare(`SELECT kind FROM markers WHERE id = ?`)
    .get(markerId) as { kind: string } | undefined;
  if (row?.kind === "split") {
    removeSplitBankEntryByMarkerId(markerId);
  }
}
