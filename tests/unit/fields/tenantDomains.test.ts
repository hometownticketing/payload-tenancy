import { createTenantDomainsField } from "../../../src/fields/tenantDomains";
import { Config } from "payload/config";
import { CollectionConfig, Field, ArrayField, TextField } from "payload/types";
import { TenancyOptions } from "../../../src/options";
import { mergeObjects } from "../../../src/utils/mergeObjects";

// Mock dependencies
jest.mock("../../../src/utils/mergeObjects", () => ({
  mergeObjects: jest
    .fn()
    .mockImplementation((a, b) => ({ ...a, ...(b || {}) })),
}));

describe("Tenant Domains Field", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockCollection: CollectionConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOptions = {
      isolationStrategy: "domain",
    } as TenancyOptions;

    mockConfig = {} as Config;

    mockCollection = {
      slug: "tenants",
      fields: [],
    } as CollectionConfig;
  });

  it("should create basic domains field", () => {
    const field = createTenantDomainsField({
      options: mockOptions,
      config: mockConfig,
      collection: mockCollection,
    }) as ArrayField;

    const expectedField: Partial<ArrayField> = {
      type: "array",
      name: "domains",
      fields: [
        {
          type: "text",
          name: "domain",
          required: true,
        } as TextField,
      ],
      admin: {
        components: {
          RowLabel: expect.any(Function),
        },
      },
    };

    expect(field).toEqual(expect.objectContaining(expectedField));
    expect(mergeObjects).toHaveBeenCalledWith(expectedField, undefined);
  });

  it("should merge with existing domains field", () => {
    const existingField: Partial<ArrayField> = {
      name: "domains",
      type: "array",
      label: "Custom Domains",
      admin: {
        description: "List of domains for this tenant",
      },
    };

    mockCollection.fields = [existingField as Field];

    createTenantDomainsField({
      options: mockOptions,
      config: mockConfig,
      collection: mockCollection,
    }) as ArrayField;

    const expectedBaseField: Partial<ArrayField> = {
      type: "array",
      name: "domains",
      fields: [
        {
          type: "text",
          name: "domain",
          required: true,
        } as TextField,
      ],
      admin: {
        components: {
          RowLabel: expect.any(Function),
        },
      },
    };

    expect(mergeObjects).toHaveBeenCalledWith(expectedBaseField, existingField);
  });

  it("should handle collection with no matching field", () => {
    const otherField: Field = {
      name: "otherField",
      type: "text",
      required: true,
    };

    mockCollection.fields = [otherField];

    const field = createTenantDomainsField({
      options: mockOptions,
      config: mockConfig,
      collection: mockCollection,
    }) as ArrayField;

    const expectedField: Partial<ArrayField> = {
      type: "array",
      name: "domains",
      fields: [
        {
          type: "text",
          name: "domain",
          required: true,
        } as TextField,
      ],
      admin: {
        components: {
          RowLabel: expect.any(Function),
        },
      },
    };

    expect(field).toEqual(expect.objectContaining(expectedField));
    expect(mergeObjects).toHaveBeenCalledWith(expectedField, undefined);
  });

  describe("RowLabel component", () => {
    it("should return domain value when present", () => {
      const field = createTenantDomainsField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as ArrayField;

      const RowLabel = field.admin?.components?.RowLabel;
      expect(RowLabel).toBeDefined();

      if (RowLabel) {
        const result = RowLabel({ data: { domain: "example.com" } });
        expect(result).toBe("example.com");
      }
    });

    it("should return default text when domain is missing", () => {
      const field = createTenantDomainsField({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      }) as ArrayField;

      const RowLabel = field.admin?.components?.RowLabel;
      expect(RowLabel).toBeDefined();

      if (RowLabel) {
        const result = RowLabel({ data: {} });
        expect(result).toBe("New Domain");
      }
    });
  });
});
