import { authedQuery } from "@/lib/api/http";
import { prolongLicenseSchema } from "@/lib/api/schemas";
import { prolongLicense } from "@/lib/services/licenses";

export const POST = authedQuery(async (actor, request) => {
  const licenseId = new URL(request.url).pathname.split("/").at(-2)!;
  const { newExpiresAt } = prolongLicenseSchema.parse(await request.json());
  return prolongLicense(actor, licenseId, newExpiresAt);
});
