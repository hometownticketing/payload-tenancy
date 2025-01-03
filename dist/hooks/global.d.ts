import { AfterChangeHook, BeforeChangeHook, BeforeReadHook, GlobalConfig } from "payload/dist/globals/config/types";
import { TenancyOptions } from "../options";
import { Config } from "payload/config";
import { PayloadRequest } from "payload/types";
export declare const createGlobalBeforeReadHook: ({ options, config, global, }: {
    options: TenancyOptions;
    config: Config;
    global: GlobalConfig;
}) => BeforeReadHook;
export declare const createGlobalBeforeChangeHook: ({ options, config, global, }: {
    options: TenancyOptions;
    config: Config;
    global: GlobalConfig;
}) => BeforeChangeHook;
export declare const createGlobalAfterChangeHook: ({ options, config, global, }: {
    options: TenancyOptions;
    config: Config;
    global: GlobalConfig;
}) => AfterChangeHook;
export declare const getGlobalVersions: ({ options, global, req, }: {
    options: TenancyOptions;
    global: GlobalConfig;
    req: PayloadRequest;
}) => Promise<import("payload/dist/database/types").PaginatedDocs<import("payload/dist/versions/types").TypeWithVersion<import("payload/types").TypeWithID & Record<string, unknown>>>>;
export declare const getGlobalVersionById: ({ global, req, }: {
    global: GlobalConfig;
    req: PayloadRequest;
}) => Promise<import("payload/dist/versions/types").TypeWithVersion<import("payload/types").TypeWithID & Record<string, unknown>>>;
export declare const restoreGlobalVersion: ({ global, req, }: {
    global: GlobalConfig;
    req: PayloadRequest;
}) => Promise<import("payload/types").TypeWithID & Record<string, unknown>>;
