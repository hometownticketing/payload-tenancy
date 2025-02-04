import {
  Field,
  fieldHasSubFields,
  fieldIsBlockType,
  TextField,
} from "payload/types";
import { transformGlobalField } from "../../../src/utils/transformGlobalField";

const hasProperty = <T extends object, K extends PropertyKey>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown> => key in obj;

// Type guards
const isTextField = (field: Field): field is TextField => {
  return field.type === "text";
};

const isFieldWithName = (field: Field): field is Field & { name: string } => {
  return "name" in field;
};

const isFieldWithLabel = (
  field: Field,
): field is Field & { label: string | Record<string, string> } => {
  return "label" in field;
};

describe("transformGlobalField", () => {
  it("should remove required property from a basic field", () => {
    const field: TextField = {
      name: "title",
      type: "text",
      required: true,
      unique: true,
      saveToJWT: true,
      hooks: {
        beforeValidate: [],
        beforeChange: [],
        afterChange: [],
        afterRead: [],
      },
      admin: {
        description: "Title field",
      },
      access: {
        read: () => true,
      },
    };

    const transformedField = transformGlobalField(field);

    // Only 'required' should be removed according to implementation
    expect(hasProperty(transformedField, "required")).toBe(false);

    if (isTextField(transformedField)) {
      expect(hasProperty(transformedField, "unique")).toBe(true);
      expect(hasProperty(transformedField, "saveToJWT")).toBe(true);
      expect(hasProperty(transformedField, "hooks")).toBe(true);
      expect(hasProperty(transformedField, "admin")).toBe(true);
      expect(hasProperty(transformedField, "access")).toBe(true);

      // Core properties should remain
      expect(transformedField.name).toBe("title");
      expect(transformedField.type).toBe("text");
    }
  });

  it("should recursively transform fields in a group", () => {
    const field: Field = {
      type: "group",
      name: "personalInfo",
      fields: [
        {
          name: "firstName",
          type: "text",
          required: true,
          unique: true,
        },
        {
          name: "lastName",
          type: "text",
          required: true,
          unique: true,
        },
      ],
    };

    const transformedField = transformGlobalField(field);

    expect(fieldHasSubFields(transformedField)).toBe(true);
    if (fieldHasSubFields(transformedField)) {
      transformedField.fields.forEach((subfield) => {
        expect(hasProperty(subfield, "required")).toBe(false);

        if (isTextField(subfield)) {
          expect(hasProperty(subfield, "unique")).toBe(true);
          expect(subfield.type).toBe("text");
        }
      });
    }
  });

  it("should recursively transform fields in blocks", () => {
    const field: Field = {
      type: "blocks",
      name: "content",
      blocks: [
        {
          slug: "textBlock",
          fields: [
            {
              name: "content",
              type: "text",
              required: true,
              unique: true,
            },
          ],
        },
      ],
    };

    const transformedField = transformGlobalField(field);

    expect(fieldIsBlockType(transformedField)).toBe(true);
    if (fieldIsBlockType(transformedField)) {
      transformedField.blocks.forEach((block) => {
        block.fields.forEach((subfield) => {
          expect(hasProperty(subfield, "required")).toBe(false);

          if (isTextField(subfield)) {
            expect(hasProperty(subfield, "unique")).toBe(true);
            expect(subfield.type).toBe("text");
          }
        });
      });
    }
  });

  it("should handle nested array fields", () => {
    const field: Field = {
      type: "array",
      name: "items",
      fields: [
        {
          name: "item",
          type: "text",
          required: true,
          unique: true,
        },
      ],
    };

    const transformedField = transformGlobalField(field);

    expect(fieldHasSubFields(transformedField)).toBe(true);
    if (fieldHasSubFields(transformedField)) {
      transformedField.fields.forEach((subfield) => {
        expect(hasProperty(subfield, "required")).toBe(false);

        if (isTextField(subfield)) {
          expect(hasProperty(subfield, "unique")).toBe(true);
          expect(subfield.type).toBe("text");
        }
      });
    }
  });

  it("should handle deeply nested structures", () => {
    const field: Field = {
      type: "group",
      name: "content",
      fields: [
        {
          type: "blocks",
          name: "sections",
          blocks: [
            {
              slug: "textSection",
              fields: [
                {
                  name: "header",
                  type: "text",
                  required: true,
                  unique: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const transformedField = transformGlobalField(field);

    const checkNestedFields = (field: Field) => {
      if (hasProperty(field, "required")) {
        expect(hasProperty(field, "required")).toBe(false);
      }

      if (isTextField(field)) {
        expect(hasProperty(field, "unique")).toBe(true);
      }

      if (fieldHasSubFields(field)) {
        field.fields.forEach(checkNestedFields);
      }

      if (fieldIsBlockType(field)) {
        field.blocks.forEach((block) => {
          block.fields.forEach(checkNestedFields);
        });
      }
    };

    checkNestedFields(transformedField);
  });

  it("should preserve essential field properties", () => {
    const field: TextField = {
      name: "test",
      type: "text",
      label: "Test Field",
      required: true,
      unique: true,
    };

    const transformedField = transformGlobalField(field);

    if (isTextField(transformedField)) {
      if (isFieldWithName(transformedField)) {
        expect(transformedField.name).toBe("test");
      }
      expect(transformedField.type).toBe("text");
      if (isFieldWithLabel(transformedField)) {
        expect(transformedField.label).toBe("Test Field");
      }
      expect(hasProperty(transformedField, "unique")).toBe(true);
      expect(hasProperty(transformedField, "required")).toBe(false);
    }
  });
});
