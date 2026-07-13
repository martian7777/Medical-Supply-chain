import { authed, authedQuery } from "@/lib/api/http";
import { dispatchSchema } from "@/lib/api/schemas";
import { dispatchShipment, listShipments } from "@/lib/services/shipments";

export const POST = authed(dispatchSchema, dispatchShipment);

/** ?box=in is the pharmacy's inbox; ?box=out is the sender's outbox. */
export const GET = authedQuery(async (actor, request) => {
  const box = new URL(request.url).searchParams.get("box") === "out" ? "out" : "in";
  return listShipments(actor, box);
});
