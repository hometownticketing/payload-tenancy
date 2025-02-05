import { createUserTenantField } from "../../../src/fields/userTenant";
import { Config } from "payload/config";
import { CollectionConfig, RelationshipField, Validate } from "payload/types";
import { TenancyOptions } from "../../../src/options";
import { mergeObjects } from "../../../src/utils/mergeObjects";
import { getAuthorizedTenants } from "../../../src/utils/getAuthorizedTenants";

// Mock dependencies
jest.mock("../../../src/utils/mergeObjects", () => ({
  mergeObjects: jest
    .fn()
    .mockImplementation(
      (a: Record<string, unknown>, b: Record<string, unknown> = {}) => ({
        ...a,
        ...b,
      }),
    ),
}));

jest.mock("../../../src/utils/getAuthorizedTenants", () => ({
  getAuthorizedTenants: jest.fn(),
}));

describe("User Tenant Field", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockCollection: CollectionConfig;
  let mockPayload: {
    find: jest.Mock;
    findByID: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPayload = {
      find: jest.fn(),
      findByID: jest.fn(),
    };

    // ✅ Fix `TenancyOptions` missing properties issue
    mockOptions = {
      tenantCollection: "tenants",
      isolationStrategy: "path",
      sharedCollections: [], // ✅ Provide an empty array for missing properties
      sharedGlobals: [], // ✅ Provide an empty array for missing properties
    };

    mockConfig = {} as Config;

    mockCollection = {
      slug: "users",
      fields: [],
    };

    // ✅ Reset `globalThis.location` before each test
    delete (globalThis as any).location;
  });

  describe("Field Creation", () => {
    it("should create basic tenant field", () => {
      const field = createUserTenantField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;

      const expectedField: Partial<RelationshipField> = {
        type: "relationship",
        name: "tenant",
        relationTo: "tenants",
        required: true,
        validate: expect.any(Function),
        admin: {
          condition: expect.any(Function),
        },
      };

      expect(field).toEqual(expect.objectContaining(expectedField));
      expect(mergeObjects).toHaveBeenCalledWith(expectedField, undefined);
    });
  });

  describe("Admin Condition", () => {
    it("should hide field on create-first-user path", () => {
      // ✅ Properly mock `globalThis.location`
      Object.defineProperty(globalThis, "location", {
        value: new URL("https://example.com/admin/create-first-user"),
        writable: true,
      });

      const field = createUserTenantField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;

      const condition = field.admin?.condition as () => boolean;
      expect(condition()).toBe(false);
    });

    it("should show field on other paths", () => {
      // ✅ Properly mock `globalThis.location`
      Object.defineProperty(globalThis, "location", {
        value: new URL("https://example.com/admin/users/create"),
        writable: true,
      });

      const field = createUserTenantField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;

      const condition = field.admin?.condition as () => boolean;
      expect(condition()).toBe(true);
    });

    it("should handle missing location", () => {
      delete (globalThis as any).location; // ✅ Remove location to test missing case

      const field = createUserTenantField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;

      const condition = field.admin?.condition as () => boolean;
      expect(condition()).toBe(true);
    });
  });

  describe("Validation", () => {
    let field: RelationshipField;

    beforeEach(() => {
      field = createUserTenantField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as RelationshipField;
    });

    it("should allow initial user creation without validation", async () => {
      const validate = field.validate as Validate;
      const result = await validate("tenant-1", {
        payload: mockPayload,
        user: undefined,
        siblingData: {},
      });

      expect(result).toBe(true);
    });

    it("should require tenant value for existing users", async () => {
      const validate = field.validate as Validate;
      const result = await validate(undefined, {
        payload: mockPayload,
        user: { tenant: "tenant-1" },
        siblingData: {},
      });

      expect(result).toBe("Required");
    });

    it("should skip validation on frontend", async () => {
      const validate = field.validate as Validate;
      const result = await validate("tenant-1", {
        payload: undefined,
        user: { tenant: "tenant-1" },
        siblingData: {},
      });

      expect(result).toBe(true);
    });

    it("should skip validation for users without tenant", async () => {
      const validate = field.validate as Validate;
      const result = await validate("tenant-1", {
        payload: mockPayload,
        user: { tenant: undefined },
        siblingData: {},
      });

      expect(result).toBe(true);
    });

    it("should validate against authorized tenants", async () => {
      (getAuthorizedTenants as jest.Mock).mockResolvedValue([
        "tenant-1",
        "tenant-2",
      ]);

      const validate = field.validate as Validate;
      const result = await validate("tenant-1", {
        payload: mockPayload,
        user: { tenant: { id: "tenant-2" } },
        siblingData: {},
      });

      expect(getAuthorizedTenants).toHaveBeenCalledWith({
        options: mockOptions,
        payload: mockPayload,
        tenantId: "tenant-2",
      });
      expect(result).toBe(true);
    });

    it("should reject unauthorized tenants", async () => {
      (getAuthorizedTenants as jest.Mock).mockResolvedValue([
        "tenant-1",
        "tenant-2",
      ]);

      const validate = field.validate as Validate;
      const result = await validate("tenant-3", {
        payload: mockPayload,
        user: { tenant: { id: "tenant-1" } },
        siblingData: {},
      });

      expect(result).toBe("Unauthorized");
    });
  });
});
