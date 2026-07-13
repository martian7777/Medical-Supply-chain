import { authed, authedQuery } from "@/lib/api/http";
import { createDrugTypeSchema } from "@/lib/api/schemas";
import { createDrugType, listDrugTypes } from "@/lib/services/drug-types";

export const POST = authed(createDrugTypeSchema, createDrugType);
export const GET = authedQuery((actor) => listDrugTypes(actor));
