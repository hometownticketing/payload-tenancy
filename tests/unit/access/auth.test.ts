import { Config } from "payload/config";
import { Payload } from "payload";
import { getAuthorizedTenants } from "../../../src/utils/getAuthorizedTenants";
import { TenancyOptions } from "../../../src/options";
import { RequestWithTenant } from "../../../src/utils/requestWithTenant";
import { createAdminAccess } from "../../../src/access/auth";

// Mock getAuthorizedTenants
jest.mock("../../../src/utils/getAuthorizedTenants");
const mockGetAuthorizedTenants = getAuthorizedTenants as jest.MockedFunction<
  typeof getAuthorizedTenants
>;

describe("createAdminAccess", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockPayload: Payload;
  let mockReq: Partial<RequestWithTenant>;

  beforeEach(() => {
    mockOptions = {
      isolationStrategy: "domain", // Default to domain strategy
      tenantCollection: "tenants",
    } as TenancyOptions;

    mockConfig = {} as Config;

    mockPayload = {} as Payload;

    mockReq = {
      payload: mockPayload,
      user: {
        tenant: {
          id: "user-tenant-1",
        },
      },
      tenant: {
        id: "requested-tenant-1",
      },
    };

    // Reset mock
    mockGetAuthorizedTenants.mockReset();
  });

  describe("with path/domain isolation strategy", () => {
    beforeEach(() => {
      mockOptions.isolationStrategy = "path";
    });

    it("should grant access when user is authorized for the requested tenant", async () => {
      mockGetAuthorizedTenants.mockResolvedValue([
        "requested-tenant-1",
        "tenant-2",
      ]);

      const accessControl = createAdminAccess({
        options: mockOptions,
        config: mockConfig,
      });

      const result = await accessControl({ req: mockReq });

      expect(result).toBe(true);
      expect(mockGetAuthorizedTenants).toHaveBeenCalledWith({
        options: mockOptions,
        payload: mockPayload,
        tenantId: "user-tenant-1",
      });
    });

    it("should deny access when user is not authorized for the requested tenant", async () => {
      mockGetAuthorizedTenants.mockResolvedValue(["tenant-2", "tenant-3"]);

      const accessControl = createAdminAccess({
        options: mockOptions,
        config: mockConfig,
      });

      const result = await accessControl({ req: mockReq });

      expect(result).toBe(false);
      expect(mockGetAuthorizedTenants).toHaveBeenCalled();
    });

    it("should handle string tenant ID", async () => {
      // Update mock request to use string tenant ID
      const mockReqWithStringTenant: Partial<RequestWithTenant> = {
        ...mockReq,
        user: {
          tenant: "user-tenant-1", // String ID instead of object
        },
      };

      mockGetAuthorizedTenants.mockResolvedValue(["requested-tenant-1"]);

      const accessControl = createAdminAccess({
        options: mockOptions,
        config: mockConfig,
      });

      const result = await accessControl({ req: mockReqWithStringTenant });

      expect(result).toBe(true);
      expect(mockGetAuthorizedTenants).toHaveBeenCalledWith({
        options: mockOptions,
        payload: mockPayload,
        tenantId: "user-tenant-1",
      });
    });
  });

  describe("with non-path/domain isolation strategy", () => {
    beforeEach(() => {
      mockOptions.isolationStrategy = "user";
    });

    it("should bypass tenant checks and return true when no original access", async () => {
      const accessControl = createAdminAccess({
        options: mockOptions,
        config: mockConfig,
      });

      const result = await accessControl({ req: mockReq });

      expect(result).toBe(true);
      expect(mockGetAuthorizedTenants).not.toHaveBeenCalled();
    });

    it("should respect original access control when provided", async () => {
      const mockOriginalAccess = jest.fn().mockImplementation(() => false);

      const accessControl = createAdminAccess({
        options: mockOptions,
        config: mockConfig,
        original: mockOriginalAccess,
      });

      const result = await accessControl({ req: mockReq });

      expect(result).toBe(false);
      expect(mockGetAuthorizedTenants).not.toHaveBeenCalled();
      expect(mockOriginalAccess).toHaveBeenCalledWith({ req: mockReq });
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      mockOptions.isolationStrategy = "path";
    });

    it("should propagate errors from getAuthorizedTenants", async () => {
      const error = new Error("Authorization error");
      mockGetAuthorizedTenants.mockRejectedValue(error);

      const accessControl = createAdminAccess({
        options: mockOptions,
        config: mockConfig,
      });

      await expect(accessControl({ req: mockReq })).rejects.toThrow(
        "Authorization error",
      );
    });

    it("should propagate errors from original access control", async () => {
      mockGetAuthorizedTenants.mockResolvedValue(["requested-tenant-1"]);

      const error = new Error("Original access error");
      const mockOriginalAccess = jest.fn().mockRejectedValue(error);

      const accessControl = createAdminAccess({
        options: mockOptions,
        config: mockConfig,
        original: mockOriginalAccess,
      });

      await expect(accessControl({ req: mockReq })).rejects.toThrow(
        "Original access error",
      );
    });
  });
});
