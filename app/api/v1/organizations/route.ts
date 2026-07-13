import { authed } from "@/lib/api/http";
import { registerOrgSchema } from "@/lib/api/schemas";
import { registerOrganization } from "@/lib/services/licenses";

// GOV-6. There is no self-registration: the regulator decides who is in the chain.
export const POST = authed(registerOrgSchema, registerOrganization);
