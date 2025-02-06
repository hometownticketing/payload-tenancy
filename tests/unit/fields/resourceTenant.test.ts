import { createResourceTenantField } from "../../../src/fields/resourceTenant";
import { Config } from "payload/config";
import {
  CollectionConfig,
  Field,
  GlobalConfig,
  RelationshipField,
  FieldHook,
} from "payload/types";
import { TenancyOptions } from "../../../src/options";
import { mergeObjects } from "../../../src/utils/mergeObjects";
import { RequestWithTenant } from "../../../src/utils/requestWithTenant";

// Mock dependencies
jest.mock("../../../src/utils/mergeObjects", () => ({
  mergeObjects: jest
    .fn()
    .mockImplementation((a, b) => ({ ...a, ...(b || {}) })),
}));

describe("Resource Tenant Field", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockCollection: CollectionConfig;
  let mockGlobal: GlobalConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOptions = {
      tenantCollection: "tenants",
    } as TenancyOptions;

    mockConfig = {} as Config;

    mockCollection = {
      slug: "resources",
      fields: [],
    } as CollectionConfig;

    mockGlobal = {
      slug: "global-resource",
      fields: [],
    } as GlobalConfig;
  });

  it("should create basic tenant field for collection", () => {
    const field = createResourceTenantField({
      options: mockOptions,
      config: mockConfig,
      collection: mockCollection,
    }) as RelationshipField;

    const expectedField: Partial<RelationshipField> = {
      type: "relationship",
      name: "tenant",
      relationTo: "tenants",
      hooks: {
        beforeChange: expect.arrayContaining([expect.any(Function)]),
      },
    };

    expect(field).toEqual(expect.objectContaining(expectedField));
    expect(mergeObjects).toHaveBeenCalledWith(expectedField, undefined);
  });

  it("should create basic tenant field for global", () => {
    const field = createResourceTenantField({
      options: mockOptions,
      config: mockConfig,
      global: mockGlobal,
    }) as RelationshipField;

    const expectedField: Partial<RelationshipField> = {
      type: "relationship",
      name: "tenant",
      relationTo: "tenants",
      hooks: {
        beforeChange: expect.arrayContaining([expect.any(Function)]),
      },
    };

    expect(field).toEqual(expect.objectContaining(expectedField));
    expect(mergeObjects).toHaveBeenCalledWith(expectedField, undefined);
  });

  it("should merge with existing tenant field in collection", () => {
    const existingField: Partial<RelationshipField> = {
      name: "tenant",
      type: "relationship",
      required: true,
      admin: {
        position: "sidebar",
      },
    };

    mockCollection.fields = [existingField as Field];

    (mergeObjects as jest.Mock).mockReturnValueOnce({
      type: "relationship",
      name: "tenant",
      relationTo: "tenants",
      required: true,
      admin: {
        position: "sidebar",
      },
      hooks: {
        beforeChange: expect.arrayContaining([expect.any(Function)]),
      },
    });

    const field = createResourceTenantField({
      options: mockOptions,
      config: mockConfig,
      collection: mockCollection,
    }) as RelationshipField;

    const expectedBaseField: Partial<RelationshipField> = {
      type: "relationship",
      name: "tenant",
      relationTo: "tenants",
      hooks: {
        beforeChange: expect.arrayContaining([expect.any(Function)]),
      },
    };

    expect(mergeObjects).toHaveBeenCalledWith(expectedBaseField, existingField);
    expect(field.required).toBe(true);
    expect(field.admin?.position).toBe("sidebar");
  });

  it("should merge with existing tenant field in global", () => {
    const existingField: Partial<RelationshipField> = {
      name: "tenant",
      type: "relationship",
      required: true,
      admin: {
        position: "sidebar",
      },
    };

    mockGlobal.fields = [existingField as Field];

    (mergeObjects as jest.Mock).mockReturnValueOnce({
      type: "relationship",
      name: "tenant",
      relationTo: "tenants",
      required: true,
      admin: {
        position: "sidebar",
      },
      hooks: {
        beforeChange: expect.arrayContaining([expect.any(Function)]),
      },
    });

    const field = createResourceTenantField({
      options: mockOptions,
      config: mockConfig,
      global: mockGlobal,
    }) as RelationshipField;

    const expectedBaseField: Partial<RelationshipField> = {
      type: "relationship",
      name: "tenant",
      relationTo: "tenants",
      hooks: {
        beforeChange: expect.arrayContaining([expect.any(Function)]),
      },
    };

    expect(mergeObjects).toHaveBeenCalledWith(expectedBaseField, existingField);
    expect(field.required).toBe(true);
    expect(field.admin?.position).toBe("sidebar");
  });

  describe("beforeChange hook", () => {
    it("should assign tenant ID from request tenant", () => {
      const field = createResourceTenantField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;

      const mockReq: Partial<RequestWithTenant> = {
        tenant: { id: "tenant-123" },
      };

      const beforeChangeHooks = field.hooks?.beforeChange;
      const hookFn = beforeChangeHooks?.[0] as FieldHook;
      const result = hookFn({ req: mockReq } as any);

      expect(result).toBe("tenant-123");
    });

    it("should assign tenant ID from user tenant", () => {
      const field = createResourceTenantField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;

      const mockReq: Partial<RequestWithTenant> = {
        user: { tenant: { id: "tenant-456" } },
      };

      const beforeChangeHooks = field.hooks?.beforeChange;
      const hookFn = beforeChangeHooks?.[0] as FieldHook;
      const result = hookFn({ req: mockReq } as any);

      expect(result).toBe("tenant-456");
    });

    it("should prefer request tenant over user tenant", () => {
      const field = createResourceTenantField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;

      const mockReq: Partial<RequestWithTenant> = {
        tenant: { id: "tenant-123" },
        user: { tenant: { id: "tenant-456" } },
      };

      const beforeChangeHooks = field.hooks?.beforeChange;
      const hookFn = beforeChangeHooks?.[0] as FieldHook;
      const result = hookFn({ req: mockReq } as any);

      expect(result).toBe("tenant-123");
    });

    it("should handle missing tenant information", () => {
      const field = createResourceTenantField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;

      const mockReq: Partial<RequestWithTenant> = {};

      const beforeChangeHooks = field.hooks?.beforeChange;
      const hookFn = beforeChangeHooks?.[0] as FieldHook;
      const result = hookFn({ req: mockReq } as any);

      expect(result).toBeUndefined();
    });
  });
});
