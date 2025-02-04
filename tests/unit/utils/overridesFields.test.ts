import { overrideFields } from "../../../src/utils/overrideFields";
import { Field } from "payload/types";

describe("overrideFields", () => {
  const original: Field[] = [
    { name: "title", type: "text" } as Field,
    { name: "description", type: "textarea" } as Field,
    { name: "category", type: "select", options: ["A", "B", "C"] } as Field,
  ];

  it("should prioritize frontOverrides over backOverrides", () => {
    const frontOverrides: Field[] = [
      { name: "description", type: "json" } as Field,
    ];
    const backOverrides: Field[] = [
      { name: "description", type: "textarea" } as Field,
    ];

    const result = overrideFields(original, frontOverrides, backOverrides);

    const expectedResult: Field[] = [
      { name: "title", type: "text" } as Field,
      { name: "description", type: "json" } as Field,
      { name: "category", type: "select", options: ["A", "B", "C"] } as Field,
    ];

    expect(result).toEqual(expect.arrayContaining(expectedResult));
  });

  it("should include backOverrides if not present in original", () => {
    const frontOverrides: Field[] = [
      { name: "description", type: "json" } as Field,
    ];
    const backOverrides: Field[] = [
      { name: "status", type: "checkbox" } as Field,
    ];

    const result = overrideFields(original, frontOverrides, backOverrides);

    const expectedResult: Field[] = [
      { name: "title", type: "text" } as Field,
      { name: "description", type: "json" } as Field,
      { name: "category", type: "select", options: ["A", "B", "C"] } as Field,
      { name: "status", type: "checkbox" } as Field,
    ];

    expect(result).toEqual(expect.arrayContaining(expectedResult));
  });
});
