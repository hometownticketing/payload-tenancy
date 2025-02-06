import { transformGlobalCollectionField } from "../../../src/utils/transformGlobalCollectionField";
import { Field } from "payload/types";

const hasFields = (field: Field): field is Field & { fields: Field[] } =>
  "fields" in field && Array.isArray(field.fields);

const hasBlocks = (
  field: Field,
): field is Field & { blocks: { fields: Field[] }[] } =>
  "blocks" in field && Array.isArray(field.blocks);

describe("transformGlobalCollectionField", () => {
  it("should remove unwanted properties", () => {
    const field: Field = {
      name: "testField",
      type: "text",
      unique: true,
      saveToJWT: true,
      hooks: [],
      admin: {},
      access: {},
    } as Field;

    const transformedField = transformGlobalCollectionField(field);
    expect(transformedField).not.toHaveProperty("unique");
    expect(transformedField).not.toHaveProperty("saveToJWT");
    expect(transformedField).not.toHaveProperty("hooks");
    expect(transformedField).not.toHaveProperty("admin");
    expect(transformedField).not.toHaveProperty("access");
  });

  it("should recursively transform subfields if fieldHasSubFields is true", () => {
    const field = {
      name: "parentField",
      type: "group",
      fields: [
        {
          name: "childField",
          type: "text",
          unique: true,
        },
      ],
    } as unknown as Field; // Explicitly casting to avoid TypeScript errors

    const transformedField = transformGlobalCollectionField(field);

    if (hasFields(transformedField)) {
      expect(transformedField.fields).toBeDefined();
      expect(transformedField.fields[0]).not.toHaveProperty("unique");
    }
  });

  it("should recursively transform block fields if fieldIsBlockType is true", () => {
    const field = {
      name: "blockField",
      type: "blocks",
      blocks: [
        {
          slug: "block1",
          fields: [
            {
              name: "nestedField",
              type: "number",
              unique: true,
            },
          ],
        },
      ],
    } as unknown as Field; // Explicitly casting to avoid TypeScript errors

    const transformedField = transformGlobalCollectionField(field);

    if (hasBlocks(transformedField)) {
      expect(transformedField.blocks).toBeDefined();
      expect(transformedField.blocks[0].fields[0]).not.toHaveProperty("unique");
    }
  });
});
