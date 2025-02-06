import { getAuthorizedTenants } from "../../../src/utils/getAuthorizedTenants";
import { Payload } from "payload";
import { TenancyOptions } from "../../../src/options";

describe("getAuthorizedTenants", () => {
  const mockPayload: Partial<Payload> = {
    find: jest.fn(),
  };

  const mockOptions: TenancyOptions = {
    tenantCollection: "tenants",
    isolationStrategy: "path",
    sharedCollections: [],
    sharedGlobals: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return an empty array if no tenantId is provided", async () => {
    const tenants = await getAuthorizedTenants({
      options: mockOptions,
      payload: mockPayload as Payload,
      tenantId: "",
    });
    expect(tenants).toEqual([]);
  });

  it("should return only the provided tenant ID if no sub-tenants exist", async () => {
    (mockPayload.find as jest.Mock).mockResolvedValue({ docs: [] });

    const tenants = await getAuthorizedTenants({
      options: mockOptions,
      payload: mockPayload as Payload,
      tenantId: "tenant-1",
    });

    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: "tenants",
      where: { parent: { equals: "tenant-1" } },
    });

    expect(tenants).toEqual(["tenant-1"]);
  });

  it("should return the tenant ID and all sub-tenant IDs", async () => {
    (mockPayload.find as jest.Mock)
      .mockResolvedValueOnce({ docs: [{ id: "sub-tenant-1" }] })
      .mockResolvedValueOnce({ docs: [{ id: "sub-tenant-2" }] })
      .mockResolvedValueOnce({ docs: [] }); // No more sub-tenants

    const tenants = await getAuthorizedTenants({
      options: mockOptions,
      payload: mockPayload as Payload,
      tenantId: "tenant-1",
    });

    expect(tenants).toEqual(["tenant-1", "sub-tenant-1", "sub-tenant-2"]);
    expect(mockPayload.find).toHaveBeenCalledTimes(3);
  });
});
