import { Response } from "express";
import { Payload } from "payload";
import { Config } from "payload/config";
import { TypeWithID } from "payload/dist/collections/config/types";
import { createPathMapping } from "../../../src/middleware/pathMapping";
import { TenancyOptions } from "../../../src/options";
import { RequestWithTenant } from "../../../src/utils/requestWithTenant";
import { PaginatedDocs } from "payload/database";

interface Tenant extends TypeWithID, Record<string, unknown> {
  id: string;
  slug: string;
  [key: string]: unknown;
}

const createMockRequest = (url: string): Partial<RequestWithTenant> => ({
  url,
  tenant: undefined,
});

describe("createPathMapping middleware", () => {
  let mockPayload: jest.Mocked<Payload>;
  let mockConfig: Config;
  let mockOptions: TenancyOptions;
  let mockRes: Response;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockPayload = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Payload>;

    mockConfig = {
      routes: {
        admin: "/admin",
      },
    } as Config;

    mockOptions = {
      tenantCollection: "tenants",
    } as TenancyOptions;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    mockNext = jest.fn();
  });

  describe("admin route handling", () => {
    it("should allow access to admin static resources", async () => {
      const adminRoutes = [
        "/admin/@payload/styles.css",
        "/admin/bundle.js",
        "/admin/some-file.png",
      ];

      for (const url of adminRoutes) {
        jest.clearAllMocks();
        const mockReq = createMockRequest(url);

        const middleware = createPathMapping({
          options: mockOptions,
          config: mockConfig,
          payload: mockPayload,
        });

        await middleware(mockReq as RequestWithTenant, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockPayload.find).not.toHaveBeenCalled();
      }
    });

    it("should deny access to admin route and subroutes", async () => {
      const adminRoutes = [
        "/admin",
        "/admin/",
        "/admin/collections",
        "/admin/collections/posts",
      ];

      for (const url of adminRoutes) {
        jest.clearAllMocks();
        const mockReq = createMockRequest(url);

        const middleware = createPathMapping({
          options: mockOptions,
          config: mockConfig,
          payload: mockPayload,
        });

        await middleware(mockReq as RequestWithTenant, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.send).toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
      }
    });
  });

  describe("tenant path handling", () => {
    it("should attach tenant and modify URL for valid tenant path", async () => {
      const mockReq = createMockRequest("/tenant-1/api/posts");
      const mockTenant: Tenant = {
        id: "tenant1",
        slug: "tenant-1/api",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPaginatedResponse: PaginatedDocs<
        TypeWithID & Record<string, unknown>
      > = {
        docs: [mockTenant],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      };

      mockPayload.find.mockResolvedValue(mockPaginatedResponse);

      const middleware = createPathMapping({
        options: mockOptions,
        config: mockConfig,
        payload: mockPayload,
      });

      await middleware(mockReq as RequestWithTenant, mockRes, mockNext);

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "tenants",
        where: {
          slug: {
            equals: "tenant-1/api",
          },
        },
      });

      expect(mockReq.tenant).toEqual(mockTenant);
      expect(mockReq.url).toBe("/posts");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle URL encoded tenant slugs", async () => {
      const mockReq = createMockRequest("/tenant%20space/api/posts");
      const mockTenant: Tenant = {
        id: "tenant1",
        slug: "tenant space/api",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPaginatedResponse: PaginatedDocs<
        TypeWithID & Record<string, unknown>
      > = {
        docs: [mockTenant],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      };

      mockPayload.find.mockResolvedValue(mockPaginatedResponse);

      const middleware = createPathMapping({
        options: mockOptions,
        config: mockConfig,
        payload: mockPayload,
      });

      await middleware(mockReq as RequestWithTenant, mockRes, mockNext);

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "tenants",
        where: {
          slug: {
            equals: "tenant space/api",
          },
        },
      });

      expect(mockReq.tenant).toEqual(mockTenant);
      expect(mockReq.url).toBe("/posts");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle URLs with multiple segments", async () => {
      const mockReq = createMockRequest("/tenant-1/nested/path/to/resource");
      const mockTenant: Tenant = {
        id: "tenant1",
        slug: "tenant-1/nested",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPaginatedResponse: PaginatedDocs<
        TypeWithID & Record<string, unknown>
      > = {
        docs: [mockTenant],
        totalDocs: 1,
        limit: 10,
        totalPages: 1,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      };

      mockPayload.find.mockResolvedValue(mockPaginatedResponse);

      const middleware = createPathMapping({
        options: mockOptions,
        config: mockConfig,
        payload: mockPayload,
      });

      await middleware(mockReq as RequestWithTenant, mockRes, mockNext);

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "tenants",
        where: {
          slug: {
            equals: "tenant-1/nested",
          },
        },
      });

      expect(mockReq.tenant).toEqual(mockTenant);
      expect(mockReq.url).toBe("/path/to/resource");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 404 for invalid tenant slug", async () => {
      const mockReq = createMockRequest("/invalid-tenant/api/posts");

      const mockEmptyResponse: PaginatedDocs<
        TypeWithID & Record<string, unknown>
      > = {
        docs: [],
        totalDocs: 0,
        limit: 10,
        totalPages: 0,
        page: 1,
        pagingCounter: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      };

      mockPayload.find.mockResolvedValue(mockEmptyResponse);

      const middleware = createPathMapping({
        options: mockOptions,
        config: mockConfig,
        payload: mockPayload,
      });

      await middleware(mockReq as RequestWithTenant, mockRes, mockNext);

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "tenants",
        where: {
          slug: {
            equals: "invalid-tenant/api",
          },
        },
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.url).toBe("/invalid-tenant/api/posts");
    });

    it("should return 404 for root path", async () => {
      const mockReq = createMockRequest("/");

      const middleware = createPathMapping({
        options: mockOptions,
        config: mockConfig,
        payload: mockPayload,
      });

      await middleware(mockReq as RequestWithTenant, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockPayload.find).not.toHaveBeenCalled();
    });
  });

  it("should handle payload.find errors", async () => {
    const mockReq = createMockRequest("/tenant-1/api/posts");
    const error = new Error("Database error");
    mockPayload.find.mockRejectedValue(error);

    const middleware = createPathMapping({
      options: mockOptions,
      config: mockConfig,
      payload: mockPayload,
    });

    await expect(
      middleware(mockReq as RequestWithTenant, mockRes, mockNext),
    ).rejects.toThrow("Database error");

    expect(mockPayload.find).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });
});
