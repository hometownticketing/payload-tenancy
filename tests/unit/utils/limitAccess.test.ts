import { limitAccess } from "../../../src/utils/limitAccess";
import { AccessResult } from "payload/config";
import { Where } from "payload/types";

describe("limitAccess", () => {
  it("should return false if originalResult is false", () => {
    const condition: Where = { someField: { equals: "value" } };
    expect(limitAccess(false, condition)).toBe(false);
  });

  it("should return the condition if originalResult is true", () => {
    const condition: Where = { someField: { equals: "value" } };
    expect(limitAccess(true, condition)).toEqual(condition);
  });

  it("should combine conditions if originalResult is an object", () => {
    const originalResult: AccessResult = { someOtherField: { equals: "data" } };
    const condition: Where = { someField: { equals: "value" } };

    expect(limitAccess(originalResult, condition)).toEqual({
      and: [originalResult, condition],
    });
  });

  it("should return the condition when originalResult is an empty object", () => {
    const originalResult: AccessResult = {};
    const condition: Where = { someField: { equals: "value" } };

    expect(limitAccess(originalResult, condition)).toEqual({
      and: [originalResult, condition],
    });
  });
});
