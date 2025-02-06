import { mergeObjects } from "../../../src/utils/mergeObjects";

type TestObject = {
  a?: { b?: { c?: number; d?: number } };
  x?: string;
  y?: number[];
};

describe("mergeObjects", () => {
  it("should return the destination object if no sources are provided", () => {
    const destination: TestObject = { a: { b: { c: 1 } } };
    expect(mergeObjects(destination)).toEqual({ a: { b: { c: 1 } } });
  });

  it("should merge nested objects without missing required properties", () => {
    const destination: TestObject = { a: { b: { c: 1 } } };
    const source: TestObject = { a: { b: { c: 2, d: 3 } } };
    expect(mergeObjects(destination, source)).toEqual({
      a: { b: { c: 2, d: 3 } },
    });
  });

  it("should append elements to arrays", () => {
    const destination: TestObject = { y: [1, 2] };
    const source: TestObject = { y: [3, 4] };
    expect(mergeObjects(destination, source)).toEqual({ y: [1, 2, 3, 4] });
  });

  it("should override non-array values with arrays", () => {
    const destination: TestObject = { x: "not an array" };
    const source: TestObject = { x: "new value" };
    expect(mergeObjects(destination, source)).toEqual({ x: "new value" });
  });

  it("should merge deeply nested objects with required properties", () => {
    const destination: TestObject = { a: { b: { c: 1, d: 2 } } };
    const source: TestObject = { a: { b: { d: 3 } } };
    expect(mergeObjects(destination, source)).toEqual({
      a: { b: { c: 1, d: 3 } },
    });
  });

  it("should handle multiple source objects", () => {
    const destination: TestObject = { a: { b: { c: 1 } } };
    const source1: TestObject = { x: "test" };
    const source2: TestObject = { y: [3, 4] };
    expect(mergeObjects(destination, source1, source2)).toEqual({
      a: { b: { c: 1 } },
      x: "test",
      y: [3, 4],
    });
  });

  it("should ignore undefined sources", () => {
    const destination: TestObject = { a: { b: { c: 1 } } };
    expect(mergeObjects(destination, undefined)).toEqual({
      a: { b: { c: 1 } },
    });
  });
});
