import { authedQuery } from "@/lib/api/http";
import { revokeLicense } from "@/lib/services/licenses";

export const POST = authedQuery(async (actor, request) => {
  // Next 15: params are async. Read the id from the URL rather than the body so it
  // cannot disagree with the route the caller actually hit.
  const licenseId = new URL(request.url).pathname.split("/").at(-2)!;
  return revokeLicense(actor, licenseId);
});
