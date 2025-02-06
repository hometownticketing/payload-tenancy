import { createDefaultAccess } from "../../../src/utils/defaultAccess";
import { Payload } from "payload";
import { TenancyOptions } from "../../../src/options";
import { Access } from "payload/types";
import { createMockRequestWithTenant } from "../../helpers/mockRequestWithTenant";

jest.mock("../../../src/utils/getAuthorizedTenants", () => ({
  getAuthorizedTenants: jest.fn().mockResolvedValue(["tenant-1"]),
}));

describe("createDefaultAccess", () => {
  const mockPayload = {} as unknown as Payload;
  const mockOptions: TenancyOptions = {
    isolationStrategy: "path",
    tenantCollection: "tenants",
    sharedCollections: [],
    sharedGlobals: [],
  };
  const accessFn: Access = createDefaultAccess({
    options: mockOptions,
    payload: mockPayload,
  });

  it("should return false if user is not logged in", async () => {
    const req = { req: createMockRequestWithTenant(null) };
    expect(await accessFn(req)).toBe(false);
  });

  it.skip("should return true if user has access to tenant", async () => {
    const req = {
      req: createMockRequestWithTenant({ tenant: { id: "tenant-1" } }),
      tenant: { id: "tenant-1" },
    };
    expect(await accessFn(req)).toBe(true);
  });

  it.skip("should return false if user does not have access to tenant", async () => {
    const req = {
      req: createMockRequestWithTenant({ tenant: { id: "tenant-2" } }),
      tenant: { id: "tenant-2" },
    };
    expect(await accessFn(req)).toBe(false);
  });
});
