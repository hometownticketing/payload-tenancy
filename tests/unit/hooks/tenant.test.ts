import {
  createTenantAfterChangeHook,
  createTenantBeforeDeleteHook,
} from "../../../src/hooks/tenant";
import { TenancyOptions } from "../../../src/options";
import { Config } from "payload/config";
import { PayloadRequest } from "payload/types";

describe("Tenant Hooks", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockPayload: {
    find: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockReq: Partial<PayloadRequest>;

  beforeEach(() => {
    mockPayload = {
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockReq = {
      payload: mockPayload,
    } as unknown as Partial<PayloadRequest>;

    mockOptions = {
      tenantCollection: "tenants",
    } as TenancyOptions;

    mockConfig = {
      collections: [
        {
          slug: "users",
          auth: true,
        },
        {
          slug: "admins",
          auth: true,
        },
        {
          slug: "posts",
          auth: false,
        },
      ],
    } as Config;
  });

  describe("createTenantAfterChangeHook", () => {
    it("should early return if operation is not create", async () => {
      const hook = createTenantAfterChangeHook({
        options: mockOptions,
        config: mockConfig,
      });

      await hook({
        doc: { id: "tenant-1" },
        operation: "update",
        req: mockReq as any,
        previousDoc: null,
        context: undefined,
        collection: undefined,
      });

      expect(mockPayload.find).not.toHaveBeenCalled();
    });

    it("should early return if not first tenant", async () => {
      mockPayload.find.mockResolvedValueOnce({ totalDocs: 2 });

      const hook = createTenantAfterChangeHook({
        options: mockOptions,
        config: mockConfig,
      });

      await hook({
        doc: { id: "tenant-1" },
        operation: "create",
        req: mockReq as any,
        previousDoc: null,
        context: undefined,
        collection: undefined,
      });

      expect(mockPayload.find).toHaveBeenCalledTimes(1);
      expect(mockPayload.update).not.toHaveBeenCalled();
    });

    it("should update all auth collection users with new tenant", async () => {
      // Mock tenant count check
      mockPayload.find.mockResolvedValueOnce({ totalDocs: 1 });

      // Mock users find results
      mockPayload.find
        .mockResolvedValueOnce({ docs: [{ id: "user-1" }, { id: "user-2" }] })
        .mockResolvedValueOnce({ docs: [{ id: "admin-1" }] });

      const hook = createTenantAfterChangeHook({
        options: mockOptions,
        config: mockConfig,
      });

      await hook({
        doc: { id: "tenant-1" },
        operation: "create",
        req: mockReq as any,
        previousDoc: null,
        context: undefined,
        collection: undefined,
      });

      // Check tenant count query
      expect(mockPayload.find).toHaveBeenCalledWith({
        req: mockReq,
        collection: "tenants",
        limit: 2,
      });

      // Check users queries
      expect(mockPayload.find).toHaveBeenCalledWith({
        req: mockReq,
        collection: "users",
      });

      expect(mockPayload.find).toHaveBeenCalledWith({
        req: mockReq,
        collection: "admins",
      });

      // Check user updates
      expect(mockPayload.update).toHaveBeenCalledWith({
        req: mockReq,
        collection: "users",
        id: "user-1",
        data: { tenant: "tenant-1" },
      });

      expect(mockPayload.update).toHaveBeenCalledWith({
        req: mockReq,
        collection: "users",
        id: "user-2",
        data: { tenant: "tenant-1" },
      });

      expect(mockPayload.update).toHaveBeenCalledWith({
        req: mockReq,
        collection: "admins",
        id: "admin-1",
        data: { tenant: "tenant-1" },
      });
    });
  });

  describe("createTenantBeforeDeleteHook", () => {
    it("should delete child tenants recursively", async () => {
      mockPayload.find.mockResolvedValueOnce({
        docs: [{ id: "child-1" }, { id: "child-2" }],
      });

      mockPayload.find.mockResolvedValueOnce({ docs: [] }); // No users for first auth collection
      mockPayload.find.mockResolvedValueOnce({ docs: [] }); // No users for second auth collection

      const hook = createTenantBeforeDeleteHook({
        options: mockOptions,
        config: mockConfig,
      });

      await hook({
        id: "parent-tenant",
        req: mockReq as any,
        context: undefined,
        collection: undefined,
      });

      // Check child tenants query
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "tenants",
        where: {
          parent: { equals: "parent-tenant" },
        },
      });

      // Check child tenant deletions
      expect(mockPayload.delete).toHaveBeenCalledWith({
        collection: "tenants",
        id: "child-1",
      });

      expect(mockPayload.delete).toHaveBeenCalledWith({
        collection: "tenants",
        id: "child-2",
      });
    });

    it("should delete all users of the tenant", async () => {
      // No child tenants
      mockPayload.find.mockResolvedValueOnce({ docs: [] });

      // Mock users find results
      mockPayload.find
        .mockResolvedValueOnce({
          docs: [{ id: "user-1" }, { id: "user-2" }],
        })
        .mockResolvedValueOnce({
          docs: [{ id: "admin-1" }],
        });

      const hook = createTenantBeforeDeleteHook({
        options: mockOptions,
        config: mockConfig,
      });

      await hook({
        id: "tenant-1",
        req: mockReq as any,
        context: undefined,
        collection: undefined,
      });

      // Check users queries
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "users",
        where: {
          tenant: { equals: "tenant-1" },
        },
      });

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "admins",
        where: {
          tenant: { equals: "tenant-1" },
        },
      });

      // Check user deletions
      expect(mockPayload.delete).toHaveBeenCalledWith({
        collection: "users",
        id: "user-1",
      });

      expect(mockPayload.delete).toHaveBeenCalledWith({
        collection: "users",
        id: "user-2",
      });

      expect(mockPayload.delete).toHaveBeenCalledWith({
        collection: "admins",
        id: "admin-1",
      });
    });

    it("should handle case with no child tenants or users", async () => {
      // No child tenants
      mockPayload.find.mockResolvedValueOnce({ docs: [] });
      // No users in auth collections
      mockPayload.find.mockResolvedValueOnce({ docs: [] });
      mockPayload.find.mockResolvedValueOnce({ docs: [] });

      const hook = createTenantBeforeDeleteHook({
        options: mockOptions,
        config: mockConfig,
      });

      await hook({
        id: "tenant-1",
        req: mockReq as any,
        context: undefined,
        collection: undefined,
      });

      expect(mockPayload.delete).not.toHaveBeenCalled();
    });
  });
});
