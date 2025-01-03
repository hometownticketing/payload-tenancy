import { GlobalConfig } from "payload/dist/globals/config/types";
import { TenancyOptions } from "../../options";
import { Endpoint } from "payload/config";
export declare const createGetVersionsRoute: (options: TenancyOptions, global: GlobalConfig) => Omit<Endpoint, "root">;
export declare const createGetVersionByIdRoute: (global: GlobalConfig) => Omit<Endpoint, "root">;
export declare const createRestoreVersionRoute: (global: GlobalConfig) => Omit<Endpoint, "root">;
