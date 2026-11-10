import { Payload } from "payload";
import {
  findTenantById,
  findTenantBySlug,
  forgetTenants,
} from "../../../src/utils/tenantCache";

const TENANT = { id: "tenant-1", slug: "instance/school" };

const buildPayload = (docs: unknown[] = [TENANT]) =>
  ({
    find: jest.fn().mockResolvedValue({ docs }),
  }) as unknown as jest.Mocked<Payload>;

describe("tenantCache", () => {
  beforeEach(() => {
    forgetTenants();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should look a tenant up by slug without a count", async () => {
    const payload = buildPayload();

    const tenant = await findTenantBySlug({
      payload,
      tenantCollection: "tenants",
      slug: "instance/school",
    });

    expect(tenant).toBe(TENANT);
    expect(payload.find).toHaveBeenCalledWith({
      collection: "tenants",
      where: { slug: { equals: "instance/school" } },
      depth: 0,
      limit: 1,
      pagination: false,
    });
  });

  it("should look a tenant up by id without a count", async () => {
    const payload = buildPayload();

    const tenant = await findTenantById({
      payload,
      tenantCollection: "tenants",
      id: "tenant-1",
    });

    expect(tenant).toBe(TENANT);
    expect(payload.find).toHaveBeenCalledWith({
      collection: "tenants",
      where: { id: { equals: "tenant-1" } },
      depth: 0,
      limit: 1,
      pagination: false,
    });
  });

  it("should not look the same slug up twice within a minute", async () => {
    const payload = buildPayload();
    jest.spyOn(Date, "now").mockReturnValue(0);
    const args = {
      payload,
      tenantCollection: "tenants",
      slug: "instance/school",
    };

    await findTenantBySlug(args);
    jest.spyOn(Date, "now").mockReturnValue(59_999);
    const tenant = await findTenantBySlug(args);

    expect(tenant).toBe(TENANT);
    expect(payload.find).toHaveBeenCalledTimes(1);
  });

  it("should look a slug up again after a minute", async () => {
    const payload = buildPayload();
    jest.spyOn(Date, "now").mockReturnValue(0);
    const args = {
      payload,
      tenantCollection: "tenants",
      slug: "instance/school",
    };

    await findTenantBySlug(args);
    jest.spyOn(Date, "now").mockReturnValue(60_000);
    await findTenantBySlug(args);

    expect(payload.find).toHaveBeenCalledTimes(2);
  });

  it("should remember a slug that matched no tenant", async () => {
    const payload = buildPayload([]);
    const args = { payload, tenantCollection: "tenants", slug: "api/graphql" };

    await findTenantBySlug(args);
    const tenant = await findTenantBySlug(args);

    expect(tenant).toBeUndefined();
    expect(payload.find).toHaveBeenCalledTimes(1);
  });

  it("should remember a tenant found by slug for lookups by id", async () => {
    const payload = buildPayload();

    await findTenantBySlug({
      payload,
      tenantCollection: "tenants",
      slug: "instance/school",
    });
    const tenant = await findTenantById({
      payload,
      tenantCollection: "tenants",
      id: "tenant-1",
    });

    expect(tenant).toBe(TENANT);
    expect(payload.find).toHaveBeenCalledTimes(1);
  });

  it("should remember a tenant found by id for lookups by slug", async () => {
    const payload = buildPayload();

    await findTenantById({
      payload,
      tenantCollection: "tenants",
      id: "tenant-1",
    });
    const tenant = await findTenantBySlug({
      payload,
      tenantCollection: "tenants",
      slug: "instance/school",
    });

    expect(tenant).toBe(TENANT);
    expect(payload.find).toHaveBeenCalledTimes(1);
  });

  it("should look a slug up again after a failed lookup", async () => {
    const payload = buildPayload();
    payload.find.mockRejectedValueOnce(new Error("db down"));
    const args = {
      payload,
      tenantCollection: "tenants",
      slug: "instance/school",
    };

    await expect(findTenantBySlug(args)).rejects.toThrow("db down");
    const tenant = await findTenantBySlug(args);

    expect(tenant).toBe(TENANT);
    expect(payload.find).toHaveBeenCalledTimes(2);
  });

  it("should look tenants up again once they are forgotten", async () => {
    const payload = buildPayload();
    const args = {
      payload,
      tenantCollection: "tenants",
      slug: "instance/school",
    };

    await findTenantBySlug(args);
    forgetTenants();
    await findTenantBySlug(args);

    expect(payload.find).toHaveBeenCalledTimes(2);
  });
});
