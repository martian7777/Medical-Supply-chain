import { authedQuery } from "@/lib/api/http";
import { listInventory } from "@/lib/services/dispense";

/** PH-3 / MFR-6: what this organization currently holds. */
export const GET = authedQuery((actor) => listInventory(actor));
