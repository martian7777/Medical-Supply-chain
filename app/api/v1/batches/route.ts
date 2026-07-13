import { authed, authedQuery } from "@/lib/api/http";
import { createBatchSchema } from "@/lib/api/schemas";
import { createBatch, listBatches } from "@/lib/services/batches";

export const POST = authed(createBatchSchema, createBatch);
export const GET = authedQuery((actor) => listBatches(actor));

// Generating up to 5,000 units is a single Postgres statement (~0.3s), but give the
// function room: a cold start plus auth plus the insert should never approach Hobby's
// 10s ceiling, and if it ever does we want the timeout, not a silent kill.
export const maxDuration = 30;
