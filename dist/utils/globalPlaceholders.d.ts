import { Payload } from "payload";
import { Config } from "payload/config";
import { TenancyOptions } from "../options";
/**
 * Payload reads its own copy of a global before the tenancy hooks swap in the
 * tenant's. For an isolated global nothing uses that copy beyond whether it
 * exists, and once it exists it always will, so read it once.
 */
export declare const rememberGlobalPlaceholders: ({ options, config, payload, }: {
    options: TenancyOptions;
    config: Config;
    payload: Payload;
}) => void;
