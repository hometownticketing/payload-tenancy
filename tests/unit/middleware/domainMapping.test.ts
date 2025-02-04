import { Response } from "express";
import { Payload } from "payload";
import { Config } from "payload/config";
import { TypeWithID } from "payload/dist/collections/config/types";
import { createDomainMapping } from "../../../src/middleware/domainMapping";
import { TenancyOptions } from "../../../src/options";
import { RequestWithTenant } from "../../../src/utils/requestWithTenant";
import { PaginatedDocs } from "payload/database";

interface Tenant extends TypeWithID, Record<string, unknown> {
  id: string;
  domains: Array<{ domain: string }>;
  [key: string]: unknown;
}

const createMockRequest = (hostname: string): Partial<RequestWithTenant> => ({
  hostname,
  tenant: undefined,
});

describe("createDomainMapping middleware", () => {
  let mockPayload: jest.Mocked<Payload>;
  let mockConfig: Config;
  let mockOptions: TenancyOptions;
  let mockRes: Response;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockPayload = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Payload>;

    mockConfig = {} as Config;

    mockOptions = {
      tenantCollection: "tenants",
    } as TenancyOptions;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    mockNext = jest.fn();
  });

  it("should attach tenant to request when domain exists", async () => {
    const mockReq = createMockRequest("example.com");

    const mockTenant: Tenant = {
      id: "tenant1",
      domains: [{ domain: "example.com" }],
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

    const middleware = createDomainMapping({
      options: mockOptions,
      config: mockConfig,
      payload: mockPayload,
    });

    await middleware(mockReq as RequestWithTenant, mockRes, mockNext);

    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: "tenants",
      where: {
        "domains.domain": {
          equals: "example.com",
        },
      },
    });

    expect(mockReq.tenant).toEqual(mockTenant);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should return 404 when domain does not exist", async () => {
    const mockReq = createMockRequest("unknown.com");

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

    const middleware = createDomainMapping({
      options: mockOptions,
      config: mockConfig,
      payload: mockPayload,
    });

    await middleware(mockReq as RequestWithTenant, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.send).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should handle different domain formats", async () => {
    const testCases = [
      "example.com",
      "sub.example.com",
      "example-site.com",
      "localhost",
    ];

    for (const domain of testCases) {
      // Reset mocks
      jest.clearAllMocks();

      // Create new request for this test case
      const mockReq = createMockRequest(domain);

      const mockTenant: Tenant = {
        id: "tenant1",
        domains: [{ domain }],
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

      const middleware = createDomainMapping({
        options: mockOptions,
        config: mockConfig,
        payload: mockPayload,
      });

      await middleware(mockReq as RequestWithTenant, mockRes, mockNext);

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "tenants",
        where: {
          "domains.domain": {
            equals: domain,
          },
        },
      });
      expect(mockReq.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalled();
    }
  });

  it("should handle payload.find errors", async () => {
    const mockReq = createMockRequest("example.com");
    const error = new Error("Database error");
    mockPayload.find.mockRejectedValue(error);

    const middleware = createDomainMapping({
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
