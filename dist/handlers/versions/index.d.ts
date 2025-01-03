import { Response } from "express";
import { PayloadRequest } from "payload/types";
import { GlobalConfig } from "payload/dist/globals/config/types";
import { TenancyOptions } from "../../options";
export declare const createGetVersionsRoute: (options: TenancyOptions, global: GlobalConfig) => {
    path: string;
    method: string;
    handler: (req: PayloadRequest, res: Response) => Promise<void>;
};
export declare const createGetVersionByIdRoute: (global: GlobalConfig) => {
    path: string;
    method: string;
    handler: (req: PayloadRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
};
export declare const createRestoreVersionRoute: (global: GlobalConfig) => {
    path: string;
    method: string;
    handler: (req: PayloadRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
};
