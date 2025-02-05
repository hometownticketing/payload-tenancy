import { createTenantSlugField } from "../../../src/fields/tenantSlug";
import { Config } from "payload/config";
import { CollectionConfig, Field, TextField } from "payload/types";
import { TenancyOptions } from "../../../src/options";
import { mergeObjects } from "../../../src/utils/mergeObjects";

// Mock dependencies
jest.mock("../../../src/utils/mergeObjects", () => ({
  mergeObjects: jest
    .fn()
    .mockImplementation((a, b) => ({ ...a, ...(b || {}) })),
}));

describe("Tenant Slug Field", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockCollection: CollectionConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOptions = {
      isolationStrategy: "path",
    } as TenancyOptions;

    mockConfig = {} as Config;

    mockCollection = {
      slug: "tenants",
      fields: [],
    } as CollectionConfig;
  });

  describe("Field Creation", () => {
    it("should create basic slug field", () => {
      const field = createTenantSlugField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as TextField;

      const expectedField: Partial<TextField> = {
        type: "text",
        name: "slug",
        unique: true,
        required: true,
        validate: expect.any(Function),
      };

      expect(field).toEqual(expect.objectContaining(expectedField));
      expect(mergeObjects).toHaveBeenCalledWith(expectedField, undefined);
    });

    it("should merge with existing slug field", () => {
      const existingField: Partial<TextField> = {
        name: "slug",
        type: "text",
        admin: {
          description: "Custom description",
        },
      };

      mockCollection.fields = [existingField as Field];

      createTenantSlugField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      });

      expect(mergeObjects).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "text",
          name: "slug",
          unique: true,
          required: true,
          validate: expect.any(Function),
        }),
        existingField,
      );
    });
  });

  describe("Validation", () => {
    let field: TextField;

    beforeEach(() => {
      field = createTenantSlugField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as TextField;
    });

    it("should require a value", () => {
      const validate = field.validate as (value: string) => string | boolean;
      expect(validate("")).toBe("Slug is required");
      expect(validate(undefined as unknown as string)).toBe("Slug is required");
      expect(validate(null as unknown as string)).toBe("Slug is required");
    });

    it("should not allow spaces", () => {
      const validate = field.validate as (value: string) => string | boolean;
      expect(validate("test slug")).toBe(
        "Slug cannot contain space characters",
      );
      expect(validate("test-slug")).toBe(true);
      expect(validate("test_slug")).toBe(true);
      expect(validate("testslug")).toBe(true);
    });

    it("should validate complex slugs", () => {
      const validate = field.validate as (value: string) => string | boolean;
      expect(validate("test-slug-123")).toBe(true);
      expect(validate("test_slug_123")).toBe(true);
      expect(validate("test-123_slug")).toBe(true);
      expect(validate("123-test-slug")).toBe(true);
    });

    it("should reject invalid slug formats", () => {
      const validate = field.validate as (value: string) => string | boolean;
      expect(validate("test slug 123")).toBe(
        "Slug cannot contain space characters",
      );
      expect(validate("test   slug")).toBe(
        "Slug cannot contain space characters",
      );

      // The current implementation only checks for spaces, not tabs or newlines
      // If this behavior needs to change, the regex in the source file should be updated to /^\S+$/
      expect(validate("test\tslug")).toBe(true);
      expect(validate("test\nslug")).toBe(true);
    });

    it("should handle edge cases", () => {
      const validate = field.validate as (value: string) => string | boolean;
      expect(validate(" ")).toBe("Slug cannot contain space characters");
      expect(validate("-")).toBe(true);
      expect(validate("_")).toBe(true);
      expect(validate("123")).toBe(true);
    });
  });
});
