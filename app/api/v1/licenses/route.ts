import { authed, authedQuery } from "@/lib/api/http";
import { issueLicenseSchema } from "@/lib/api/schemas";
import { issueLicense, listLicenses } from "@/lib/services/licenses";

export const POST = authed(issueLicenseSchema, issueLicense);
export const GET = authedQuery((actor) => listLicenses(actor));
