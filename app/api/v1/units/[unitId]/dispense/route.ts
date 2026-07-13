import { authedQuery } from "@/lib/api/http";
import { dispenseUnit } from "@/lib/services/dispense";

/** Terminal. Records the pharmacy and the moment — never the buyer. */
export const POST = authedQuery(async (actor, request) => {
  const unitId = new URL(request.url).pathname.split("/").at(-2)!;
  return dispenseUnit(actor, unitId);
});
