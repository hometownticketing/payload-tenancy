import { Payload } from "payload";
import { Document } from "payload/types";
type Lookup = Promise<Document | undefined>;
export declare const findTenantBySlug: ({ payload, tenantCollection, slug, }: {
    payload: Payload;
    tenantCollection: string;
    slug: string;
}) => Lookup;
export declare const findTenantById: ({ payload, tenantCollection, id, }: {
    payload: Payload;
    tenantCollection: string;
    id: string | number;
}) => Lookup;
export declare const forgetTenants: () => void;
export {};
