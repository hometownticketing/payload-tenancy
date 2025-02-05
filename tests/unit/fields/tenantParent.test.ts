import { createTenantParentField } from "../../../src/fields/tenantParent";
import { Config } from "payload/config";
import {
  CollectionConfig,
  Field,
  RelationshipField,
  PayloadRequest,
} from "payload/types";
import { TenancyOptions } from "../../../src/options";
import { mergeObjects } from "../../../src/utils/mergeObjects";
import { getAuthorizedTenants } from "../../../src/utils/getAuthorizedTenants";

// Mock dependencies
jest.mock("../../../src/utils/mergeObjects", () => ({
  mergeObjects: jest
    .fn()
    .mockImplementation((a, b) => ({ ...a, ...(b || {}) })),
}));

jest.mock("../../../src/utils/getAuthorizedTenants", () => ({
  getAuthorizedTenants: jest.fn(),
}));

describe("Tenant Parent Field", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockCollection: CollectionConfig;
  let mockPayload: {
    find: jest.Mock;
    findByID: jest.Mock;
  };
  let mockReq: Partial<PayloadRequest>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPayload = {
      find: jest.fn(),
      findByID: jest.fn(),
    };

    mockReq = {
      payload: mockPayload,
    } as unknown as Partial<PayloadRequest>;

    mockOptions = {
      tenantCollection: "tenants",
      isolationStrategy: "path",
    } as TenancyOptions;

    mockConfig = {} as Config;

    mockCollection = {
      slug: "tenants",
      fields: [],
    } as CollectionConfig;
  });

  describe("Field Creation", () => {
    it("should create basic parent field", () => {
      const field = createTenantParentField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;

      expect(field).toEqual(
        expect.objectContaining({
          type: "relationship",
          name: "parent",
          relationTo: "tenants",
          required: false,
          filterOptions: expect.any(Function),
          validate: expect.any(Function),
          access: {
            read: expect.any(Function),
            update: expect.any(Function),
          },
        }),
      );
    });

    it("should merge with existing parent field", () => {
      const existingField: Partial<RelationshipField> = {
        name: "parent",
        type: "relationship",
        admin: {
          description: "Select parent tenant",
        },
      };

      mockCollection.fields = [existingField as Field];

      createTenantParentField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      });

      expect(mergeObjects).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "relationship",
          name: "parent",
          relationTo: "tenants",
        }),
        existingField,
      );
    });
  });

  describe("Access Control", () => {
    let field: RelationshipField;

    beforeEach(() => {
      field = createTenantParentField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;
    });

    it("should deny access when no tenants exist", async () => {
      mockPayload.find.mockResolvedValue({ totalDocs: 0 });

      const access = field.access?.read;
      const result = await access?.({
        req: mockReq as PayloadRequest,
        doc: {},
      });

      expect(result).toBe(false);
    });

    it("should deny access when user has no tenant", async () => {
      mockPayload.find.mockResolvedValue({ totalDocs: 1 });

      const access = field.access?.read;
      const result = await access?.({
        req: { ...mockReq, user: {} } as PayloadRequest,
        doc: {},
      });

      expect(result).toBe(false);
    });

    it("should allow access for tenant creation", async () => {
      mockPayload.find.mockResolvedValue({ totalDocs: 1 });

      const access = field.access?.read;
      const result = await access?.({
        req: {
          ...mockReq,
          user: { tenant: { id: "tenant-1" } },
        } as PayloadRequest,
        doc: null,
      });

      expect(result).toBe(true);
    });

    it("should deny access for root tenant", async () => {
      mockPayload.find.mockResolvedValue({ totalDocs: 1 });

      const access = field.access?.read;
      const result = await access?.({
        req: {
          ...mockReq,
          user: { tenant: { id: "tenant-1" } },
        } as PayloadRequest,
        doc: { parent: null },
      });

      expect(result).toBe(false);
    });
  });

  describe("Validation", () => {
    let field: RelationshipField;

    beforeEach(() => {
      field = createTenantParentField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;
    });

    it("should prevent self-referencing", async () => {
      type ValidateFunction = (
        value: string | null,
        args: {
          payload: typeof mockPayload | null;
          id?: string;
          user?: { tenant?: { id: string } | string | null };
        },
      ) => Promise<string | boolean>;

      const validate = field.validate as ValidateFunction;
      const result = await validate("tenant-1", {
        payload: mockPayload,
        id: "tenant-1",
        user: { tenant: { id: "tenant-1" } },
      });

      expect(result).toBe("Cannot relate to itself");
    });

    it("should skip validation on frontend", async () => {
      type ValidateFunction = (
        value: string | null,
        args: {
          payload: typeof mockPayload | null;
          user?: { tenant?: { id: string } | string | null };
        },
      ) => Promise<string | boolean>;

      const validate = field.validate as ValidateFunction;
      const result = await validate("tenant-1", {
        payload: null,
        user: { tenant: { id: "tenant-1" } },
      });

      expect(result).toBe(true);
    });

    it("should allow root tenant creation without parent", async () => {
      // Mock initial tenant check
      mockPayload.find.mockResolvedValueOnce({ totalDocs: 0 });

      type ValidateFunction = (
        value: string | null,
        args: {
          payload: typeof mockPayload;
          user: { tenant: null };
        },
      ) => Promise<string | boolean>;

      const validate = field.validate as ValidateFunction;
      const result = await validate(null, {
        payload: mockPayload,
        user: { tenant: null },
      });

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "tenants",
        limit: 0,
      });
      expect(result).toBe(true);
    });

    it("should prevent assigning parent to root tenant", async () => {
      // Mock find for checking if any tenants exist
      mockPayload.find.mockResolvedValueOnce({ totalDocs: 1 });
      // Mock findByID for getting original tenant
      mockPayload.findByID.mockResolvedValueOnce({ parent: null });

      type ValidateFunction = (
        value: string | null,
        args: {
          payload: typeof mockPayload;
          id: string;
          user: { tenant: { id: string } };
        },
      ) => Promise<string | boolean>;

      const validate = field.validate as ValidateFunction;
      const result = await validate("new-parent", {
        payload: mockPayload,
        id: "root-tenant",
        user: { tenant: { id: "tenant-1" } },
      });

      // Verify find was called with correct params
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "tenants",
        limit: 0,
      });

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: "tenants",
        id: "root-tenant",
      });

      expect(result).toBe("Cannot assign parent to root tenant");
    });

    it("should require parent for non-root tenants", async () => {
      // Mock initial tenant check
      mockPayload.find.mockResolvedValueOnce({ totalDocs: 1 });

      type ValidateFunction = (
        value: null,
        args: {
          payload: typeof mockPayload;
          user: { tenant: { id: string } };
        },
      ) => Promise<string | boolean>;

      const validate = field.validate as ValidateFunction;
      const result = await validate(null, {
        payload: mockPayload,
        user: { tenant: { id: "tenant-1" } },
      });

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "tenants",
        limit: 0,
      });
      expect(result).toBe("Required");
    });

    it("should validate parent authorization", async () => {
      // Mock initial tenant check
      mockPayload.find.mockResolvedValueOnce({ totalDocs: 1 });
      (getAuthorizedTenants as jest.Mock).mockResolvedValue([
        "tenant-1",
        "tenant-2",
      ]);

      type ValidateFunction = (
        value: string,
        args: {
          payload: typeof mockPayload;
          user: { tenant: { id: string } };
        },
      ) => Promise<string | boolean>;

      const validate = field.validate as ValidateFunction;
      const result = await validate("tenant-3", {
        payload: mockPayload,
        user: { tenant: { id: "tenant-1" } },
      });

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: "tenants",
        limit: 0,
      });
      expect(result).toBe("Unauthorized");
    });
  });

  describe("Filter Options", () => {
    it("should exclude current tenant from options", () => {
      const field = createTenantParentField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;

      type FilterFunction = (data: { id: string }) => {
        id: { not_equals: string };
      };

      // Verify filterOptions is a function and test it
      if (typeof field.filterOptions === "function") {
        const filterFn = field.filterOptions as FilterFunction;
        const filter = filterFn({ id: "current-tenant" });

        expect(filter).toEqual({
          id: { not_equals: "current-tenant" },
        });
      } else {
        fail("filterOptions should be a function");
      }
    });
  });
});
