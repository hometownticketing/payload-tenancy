import { Access, Config } from "payload/config";
import { Payload } from "payload";
import type { Request, Response, Application } from "express";
import type { PayloadRequest } from "payload/types";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";
import {
  createUserReadAccess,
  createUserCreateAccess,
} from "../../../src/access/user";
import { TenancyOptions } from "../../../src/options";
import { RequestWithTenant } from "../../../src/utils/requestWithTenant";
import * as defaultAccess from "../../../src/utils/defaultAccess";
import * as limitAccess from "../../../src/utils/limitAccess";
import * as getAuthorizedTenants from "../../../src/utils/getAuthorizedTenants";

// Mock dependencies
jest.mock("../../../src/utils/defaultAccess");
jest.mock("../../../src/utils/limitAccess");
jest.mock("../../../src/utils/getAuthorizedTenants");

const mockCreateDefaultAccess =
  defaultAccess.createDefaultAccess as jest.MockedFunction<
    typeof defaultAccess.createDefaultAccess
  >;
const mockLimitAccess = limitAccess.limitAccess as jest.MockedFunction<
  typeof limitAccess.limitAccess
>;
const mockGetAuthorizedTenants =
  getAuthorizedTenants.getAuthorizedTenants as jest.MockedFunction<
    typeof getAuthorizedTenants.getAuthorizedTenants
  >;

type MockRequest = Request<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs,
  Record<string, unknown>
>;

const createMockRequest = (): PayloadRequest & RequestWithTenant =>
  ({
    payload: {} as Payload,
    user: {
      id: "current-user-id",
      tenant: {
        id: "user-tenant-1",
      },
    },
    tenant: {
      id: "requested-tenant-1",
    },
    accepts: (): string[] | string | false => false,
    acceptsCharsets: (): string[] | string | false => false,
    acceptsEncodings: (): string[] | string | false => false,
    acceptsLanguages: (): string[] | string | false => false,
    get: (): string | undefined => "",
    header: (): string | string[] | undefined => undefined,
    is: (): string | false => false,
    range: (): Array<{ start: number; end: number }> | undefined => undefined,
    baseUrl: "",
    fresh: false,
    hostname: "",
    ip: "",
    ips: [],
    method: "GET",
    originalUrl: "",
    params: {},
    path: "",
    protocol: "http",
    query: {},
    route: {} as MockRequest["route"],
    secure: false,
    signedCookies: {},
    stale: false,
    subdomains: [],
    xhr: false,
    cookies: {},
    url: "",
    body: {},
    res: {} as Response,
    app: {} as Application,
  }) as unknown as PayloadRequest & RequestWithTenant;

describe("User Access Control", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockReq: PayloadRequest & RequestWithTenant;

  beforeEach(() => {
    mockOptions = {
      isolationStrategy: "path",
      tenantCollection: "tenants",
    } as TenancyOptions;

    mockConfig = {} as Config;

    mockReq = createMockRequest();

    // Reset mocks
    jest.clearAllMocks();
    mockCreateDefaultAccess.mockReturnValue(async () => true);
    mockLimitAccess.mockReturnValue(true);
    mockGetAuthorizedTenants.mockResolvedValue(["tenant-1", "tenant-2"]);
  });

  describe("createUserReadAccess", () => {
    describe("with path/domain isolation strategy", () => {
      beforeEach(() => {
        mockOptions.isolationStrategy = "path";
      });

      it("should limit access to authorized tenants plus self-access", async () => {
        const access = createUserReadAccess({
          options: mockOptions,
          config: mockConfig,
        });

        await access({ req: mockReq });

        expect(mockGetAuthorizedTenants).toHaveBeenCalledWith({
          options: mockOptions,
          payload: mockReq.payload,
          tenantId: "requested-tenant-1",
        });

        expect(mockLimitAccess).toHaveBeenCalledWith(true, {
          or: [
            {
              tenant: {
                in: ["tenant-1", "tenant-2"],
              },
            },
            {
              id: {
                equals: "current-user-id",
              },
            },
          ],
        });
      });

      it("should respect original access control", async () => {
        const mockOriginalAccess: Access = async () => false;
        mockLimitAccess.mockReturnValue(false);

        const access = createUserReadAccess({
          options: mockOptions,
          config: mockConfig,
          original: mockOriginalAccess,
        });

        const result = await access({ req: mockReq });
        expect(result).toBe(false);
      });
    });

    describe("with user isolation strategy", () => {
      beforeEach(() => {
        mockOptions.isolationStrategy = "user";
      });

      it("should grant access if user has no tenant (installation process)", async () => {
        mockReq.user.tenant = undefined;

        const access = createUserReadAccess({
          options: mockOptions,
          config: mockConfig,
        });

        const result = await access({ req: mockReq });
        expect(result).toBe(true);
      });

      it("should limit access to user's authorized tenants", async () => {
        const access = createUserReadAccess({
          options: mockOptions,
          config: mockConfig,
        });

        await access({ req: mockReq });

        expect(mockGetAuthorizedTenants).toHaveBeenCalledWith({
          options: mockOptions,
          payload: mockReq.payload,
          tenantId: "user-tenant-1",
        });

        expect(mockLimitAccess).toHaveBeenCalledWith(true, {
          tenant: {
            in: ["tenant-1", "tenant-2"],
          },
        });
      });

      it("should deny access if user is not logged in", async () => {
        mockReq.user = undefined;

        const access = createUserReadAccess({
          options: mockOptions,
          config: mockConfig,
        });

        const result = await access({ req: mockReq });
        expect(result).toBe(false);
      });

      it("should handle string tenant ID", async () => {
        mockReq.user.tenant = "user-tenant-1";

        const access = createUserReadAccess({
          options: mockOptions,
          config: mockConfig,
        });

        await access({ req: mockReq });

        expect(mockGetAuthorizedTenants).toHaveBeenCalledWith({
          options: mockOptions,
          payload: mockReq.payload,
          tenantId: "user-tenant-1",
        });
      });
    });
  });

  describe("createUserCreateAccess", () => {
    describe("with path/domain isolation strategy", () => {
      beforeEach(() => {
        mockOptions.isolationStrategy = "path";
      });

      it("should only check original access", async () => {
        const mockOriginalAccess: Access = async () => true;
        const access = createUserCreateAccess({
          options: mockOptions,
          config: mockConfig,
          original: mockOriginalAccess,
        });

        const result = await access({ req: mockReq });
        expect(result).toBe(true);
      });

      it("should use default access when no original access provided", async () => {
        const access = createUserCreateAccess({
          options: mockOptions,
          config: mockConfig,
        });

        await access({ req: mockReq });

        expect(mockCreateDefaultAccess).toHaveBeenCalledWith({
          options: mockOptions,
          payload: mockReq.payload,
        });
      });
    });

    describe("with user isolation strategy", () => {
      beforeEach(() => {
        mockOptions.isolationStrategy = "user";
      });

      it("should grant access if user has tenant and original access allows", async () => {
        const mockOriginalAccess: Access = async () => true;
        const access = createUserCreateAccess({
          options: mockOptions,
          config: mockConfig,
          original: mockOriginalAccess,
        });

        const result = await access({ req: mockReq });
        expect(result).toBe(true);
      });

      it("should deny access if user has no tenant", async () => {
        mockReq.user.tenant = undefined;

        const mockOriginalAccess: Access = async () => true;
        const access = createUserCreateAccess({
          options: mockOptions,
          config: mockConfig,
          original: mockOriginalAccess,
        });

        const result = await access({ req: mockReq });
        expect(result).toBe(false);
      });

      it("should deny access if original access denies", async () => {
        const mockOriginalAccess: Access = async () => false;
        const access = createUserCreateAccess({
          options: mockOptions,
          config: mockConfig,
          original: mockOriginalAccess,
        });

        const result = await access({ req: mockReq });
        expect(result).toBe(false);
      });
    });
  });
});
