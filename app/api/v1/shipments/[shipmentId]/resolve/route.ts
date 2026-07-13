import { authedQuery } from "@/lib/api/http";
import { resolveShipmentSchema } from "@/lib/api/schemas";
import { resolveShipment } from "@/lib/services/shipments";

/**
 * Accept / reject / partially accept. One endpoint, because they are one decision:
 * "which of these units actually arrived?" Omitting acceptedUnitIds accepts all;
 * naming a subset accepts that subset and returns the rest to the sender.
 */
export const POST = authedQuery(async (actor, request) => {
  const shipmentId = new URL(request.url).pathname.split("/").at(-2)!;
  const input = resolveShipmentSchema.parse(await request.json().catch(() => ({})));
  return resolveShipment(actor, shipmentId, input);
});
