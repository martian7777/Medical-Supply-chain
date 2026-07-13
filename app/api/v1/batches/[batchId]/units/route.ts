import { authedQuery } from "@/lib/api/http";
import { listBatchUnits } from "@/lib/services/batches";

/** The unit ids of one batch — this is what the QR export reads. */
export const GET = authedQuery(async (actor, request) => {
  const url = new URL(request.url);
  const batchId = url.pathname.split("/").at(-2)!;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 500), 1000);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  return listBatchUnits(actor, batchId, limit, offset);
});
