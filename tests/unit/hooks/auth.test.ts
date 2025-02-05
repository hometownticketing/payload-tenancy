import { createRestrictLogin } from "../../../src/hooks/auth";
import { getAuthorizedTenants } from "../../../src/utils/getAuthorizedTenants";
import { TenancyOptions } from "../../../src/options";
import { Config } from "payload/config";
import { CollectionBeforeLoginHook, PayloadRequest } from "payload/types";

jest.mock("../../../src/utils/getAuthorizedTenants", () => ({
  getAuthorizedTenants: jest.fn(),
}));

describe("createRestrictLogin", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockReq;
  let mockUser;
  let hook: CollectionBeforeLoginHook;

  beforeEach(() => {
    mockOptions = { isolationStrategy: "path" } as TenancyOptions;
    mockConfig = {} as Config;
    mockUser = { tenant: "tenant-123" };
    mockReq = {
      tenant: { id: "tenant-123" },
      payload: {},
      get: jest.fn(),
      header: jest.fn(),
    } as unknown as Partial<PayloadRequest>;
    hook = createRestrictLogin({ options: mockOptions, config: mockConfig });
  });

  it("should allow login if tenant is authorized", async () => {
    (getAuthorizedTenants as jest.Mock).mockResolvedValue(["tenant-123"]);

    await expect(
      hook({
        req: mockReq,
        user: mockUser,
        collection: undefined,
        context: undefined,
      }),
    ).resolves.toBeUndefined();

    expect(getAuthorizedTenants).toHaveBeenCalledWith({
      options: mockOptions,
      payload: mockReq.payload,
      tenantId: mockUser.tenant,
    });
  });

  it("should throw an error if tenant is not authorized", async () => {
    (getAuthorizedTenants as jest.Mock).mockResolvedValue(["tenant-999"]);

    await expect(
      hook({
        req: mockReq,
        user: mockUser,
        collection: undefined,
        context: undefined,
      }),
    ).rejects.toThrow("Unauthorized tenant");
  });

  it("should not check tenants if isolation strategy is not 'path' or 'domain'", async () => {
    jest.clearAllMocks();

    mockOptions = { isolationStrategy: "user" } as TenancyOptions;
    hook = createRestrictLogin({ options: mockOptions, config: mockConfig });

    await expect(
      hook({
        req: mockReq as PayloadRequest,
        user: mockUser,
        collection: undefined,
        context: undefined,
      }),
    ).resolves.toBeUndefined();

    expect(getAuthorizedTenants).not.toHaveBeenCalled();
  });
});
