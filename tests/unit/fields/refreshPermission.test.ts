import { createRefreshPermissionsField } from "../../../src/fields/refreshPermissions";
import { Config } from "payload/config";
import { CollectionConfig, Field, UIField } from "payload/types";
import { TenancyOptions } from "../../../src/options";
import { mergeObjects } from "../../../src/utils/mergeObjects";

// Mock dependencies
jest.mock("../../../src/utils/mergeObjects", () => ({
  mergeObjects: jest
    .fn()
    .mockImplementation((a, b) => ({ ...a, ...(b || {}) })),
}));

// Mock the entire module
jest.mock("../../../src/components/RefreshPermissionsField", () => {
  return {
    RefreshPermissionsField: () => null,
  };
});

describe("Refresh Permissions Field", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockCollection: CollectionConfig;
  const RefreshPermissionsField = jest.requireMock(
    "../../../src/components/RefreshPermissionsField",
  ).RefreshPermissionsField;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOptions = {
      isolationStrategy: "path",
    } as TenancyOptions;

    mockConfig = {} as Config;

    mockCollection = {
      slug: "users",
      fields: [],
    } as CollectionConfig;
  });

  it("should create a basic refresh permissions field", () => {
    const field = createRefreshPermissionsField({
      options: mockOptions,
      config: mockConfig,
      collection: mockCollection,
    });

    expect(field).toEqual({
      type: "ui",
      name: "refreshPermissions",
      admin: {
        components: {
          Field: RefreshPermissionsField,
        },
      },
    });

    expect(mergeObjects).toHaveBeenCalledWith(
      {
        type: "ui",
        name: "refreshPermissions",
        admin: {
          components: {
            Field: RefreshPermissionsField,
          },
        },
      },
      undefined,
    );
  });

  it("should merge with existing refresh permissions field", () => {
    const existingField: Partial<UIField> = {
      name: "refreshPermissions",
      type: "ui",
      admin: {
        position: "sidebar",
        width: "50%",
      },
    };

    mockCollection.fields = [existingField as Field];

    // Mock mergeObjects for this specific test
    (mergeObjects as jest.Mock).mockReturnValueOnce({
      type: "ui",
      name: "refreshPermissions",
      admin: {
        position: "sidebar",
        width: "50%",
      },
    });

    const field = createRefreshPermissionsField({
      options: mockOptions,
      config: mockConfig,
      collection: mockCollection,
    });

    const expectedBaseField = {
      type: "ui",
      name: "refreshPermissions",
      admin: {
        components: {
          Field: RefreshPermissionsField,
        },
      },
    };

    expect(mergeObjects).toHaveBeenCalledWith(expectedBaseField, existingField);
    expect(field).toEqual({
      type: "ui",
      name: "refreshPermissions",
      admin: {
        position: "sidebar",
        width: "50%",
      },
    });
  });

  it("should handle collection without fields", () => {
    mockCollection = {
      slug: "users",
      fields: [],
    } as CollectionConfig;

    const field = createRefreshPermissionsField({
      options: mockOptions,
      config: mockConfig,
      collection: mockCollection,
    });

    expect(field).toEqual({
      type: "ui",
      name: "refreshPermissions",
      admin: {
        components: {
          Field: RefreshPermissionsField,
        },
      },
    });
  });

  it("should handle collection with no matching field", () => {
    const otherField: Field = {
      name: "otherField",
      type: "text",
      required: true,
    };

    mockCollection.fields = [otherField];

    const field = createRefreshPermissionsField({
      options: mockOptions,
      config: mockConfig,
      collection: mockCollection,
    });

    expect(field).toEqual({
      type: "ui",
      name: "refreshPermissions",
      admin: {
        components: {
          Field: RefreshPermissionsField,
        },
      },
    });

    expect(mergeObjects).toHaveBeenCalledWith(
      {
        type: "ui",
        name: "refreshPermissions",
        admin: {
          components: {
            Field: RefreshPermissionsField,
          },
        },
      },
      undefined,
    );
  });

  it("should preserve admin configuration when merging", () => {
    const existingField: UIField = {
      type: "ui",
      name: "refreshPermissions",
      admin: {
        position: "sidebar",
        width: "100%",
        disableBulkEdit: true,
        disableListColumn: true,
      },
    };

    mockCollection.fields = [existingField];

    (mergeObjects as jest.Mock).mockReturnValueOnce({
      type: "ui",
      name: "refreshPermissions",
      admin: {
        position: "sidebar",
        width: "100%",
        disableBulkEdit: true,
        disableListColumn: true,
        components: {
          Field: RefreshPermissionsField,
        },
      },
    });

    const field = createRefreshPermissionsField({
      options: mockOptions,
      config: mockConfig,
      collection: mockCollection,
    });

    expect(field.admin).toEqual({
      position: "sidebar",
      width: "100%",
      disableBulkEdit: true,
      disableListColumn: true,
      components: {
        Field: RefreshPermissionsField,
      },
    });
  });
});
