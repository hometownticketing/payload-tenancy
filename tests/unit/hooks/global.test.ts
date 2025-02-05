import {
  createGlobalBeforeReadHook,
  createGlobalBeforeChangeHook,
  createGlobalAfterChangeHook,
  getGlobalVersions,
  getGlobalVersionById,
  restoreGlobalVersion,
} from "../../../src/hooks/global";
import { TenancyOptions } from "../../../src/options";
import { Config } from "payload/config";
import { GlobalConfig } from "payload/types";
import { RequestWithTenant } from "../../../src/utils/requestWithTenant";

// Mock the graphql utilities
jest.mock("graphql/language", () => ({
  parse: jest.fn(),
}));

jest.mock("../../../src/utils/graphql", () => ({
  findQueryByName: jest.fn(),
  findArgumentByName: jest.fn(),
}));

describe("Global Hooks", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockGlobal: GlobalConfig;
  let mockReq: Partial<RequestWithTenant>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOptions = {
      isolationStrategy: "path",
    } as TenancyOptions;

    mockConfig = {} as Config;

    mockGlobal = {
      slug: "testGlobal",
    } as GlobalConfig;

    mockReq = {
      payload: {
        find: jest.fn(),
        findVersions: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findVersionByID: jest.fn(),
        restoreVersion: jest.fn(),
        globals: {
          config: [
            {
              slug: "testGlobal",
            },
          ],
          graphQL: [
            {
              type: { name: "TestGlobalType" },
              versionType: { name: "TestGlobalVersionType" },
            },
          ],
        },
      },
      tenant: { id: "test-tenant-123" },
      user: { tenant: "test-tenant-123" },
      query: {},
      body: {},
      payloadAPI: "REST",
      params: { id: "version-123" },
    } as unknown as Partial<RequestWithTenant>;
  });

  describe("createGlobalBeforeReadHook", () => {
    it("should initialize global when document does not exist", async () => {
      const mockFind = mockReq.payload.find as jest.Mock;
      mockFind.mockResolvedValue({ docs: [] });

      const mockCreate = mockReq.payload.create as jest.Mock;
      mockCreate.mockResolvedValue({ id: "new-doc" });

      const hook = createGlobalBeforeReadHook({
        options: mockOptions,
        config: mockConfig,
        global: mockGlobal,
      });

      const result = await hook({
        req: mockReq as any,
        context: undefined,
        doc: undefined,
        global: undefined,
      });

      expect(mockFind).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith({
        req: mockReq,
        collection: "testGlobalGlobals",
        data: {
          tenant: "test-tenant-123",
        },
      });
      expect(result).toEqual({ id: "new-doc" });
    });

    it("should return existing document when found", async () => {
      const existingDoc = { id: "existing-doc" };
      const mockFind = mockReq.payload.find as jest.Mock;
      mockFind.mockResolvedValue({ docs: [existingDoc] });

      const hook = createGlobalBeforeReadHook({
        options: mockOptions,
        config: mockConfig,
        global: mockGlobal,
      });

      const result = await hook({
        req: mockReq as any,
        context: undefined,
        doc: undefined,
        global: undefined,
      });

      expect(mockFind).toHaveBeenCalled();
      expect(result).toEqual(existingDoc);
    });

    it("should handle missing tenant", async () => {
      const reqWithoutTenant = {
        ...mockReq,
        tenant: undefined,
        user: undefined,
      };

      const hook = createGlobalBeforeReadHook({
        options: mockOptions,
        config: mockConfig,
        global: mockGlobal,
      });

      await expect(
        hook({
          req: reqWithoutTenant as any,
          context: undefined,
          doc: undefined,
          global: undefined,
        }),
      ).rejects.toThrow("Could not determine tenant");
    });
  });

  describe("createGlobalBeforeChangeHook", () => {
    it("should initialize global when document does not exist", async () => {
      const mockFind = mockReq.payload.find as jest.Mock;
      mockFind.mockResolvedValue({ docs: [] });

      const mockCreate = mockReq.payload.create as jest.Mock;
      mockCreate.mockResolvedValue({ id: "new-doc" });

      const hook = createGlobalBeforeChangeHook({
        options: mockOptions,
        config: mockConfig,
        global: mockGlobal,
      });

      const mockData = { field: "value" };

      await hook({
        req: mockReq as any,
        data: mockData,
        context: undefined,
        global: undefined,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        req: mockReq,
        collection: "testGlobalGlobals",
        data: {
          ...mockData,
          tenant: "test-tenant-123",
        },
      });
    });

    it("should update existing document when found", async () => {
      const existingDoc = { id: "existing-doc" };
      const mockFind = mockReq.payload.find as jest.Mock;
      mockFind.mockResolvedValue({ docs: [existingDoc] });

      const mockUpdate = mockReq.payload.update as jest.Mock;
      mockUpdate.mockResolvedValue({ id: "updated-doc" });

      const hook = createGlobalBeforeChangeHook({
        options: mockOptions,
        config: mockConfig,
        global: mockGlobal,
      });

      const mockData = { field: "updated-value" };

      await hook({
        req: mockReq as any,
        data: mockData,
        context: undefined,
        global: undefined,
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        req: mockReq,
        collection: "testGlobalGlobals",
        where: {
          tenant: {
            equals: "test-tenant-123",
          },
        },
        data: {
          ...mockData,
          tenant: "test-tenant-123",
        },
      });
    });
  });

  describe("createGlobalAfterChangeHook", () => {
    it("should fetch document with draft=true", async () => {
      const mockDoc = { id: "doc-123", _status: "draft" };
      const mockFind = mockReq.payload.find as jest.Mock;
      mockFind.mockResolvedValue({ docs: [mockDoc] });

      const hook = createGlobalAfterChangeHook({
        options: mockOptions,
        config: mockConfig,
        global: mockGlobal,
      });

      const result = await hook({
        req: mockReq as any,
        context: undefined,
        doc: undefined,
        global: undefined,
        previousDoc: undefined,
      });

      expect(mockFind).toHaveBeenCalledWith({
        req: mockReq,
        collection: "testGlobalGlobals",
        where: {
          tenant: {
            equals: "test-tenant-123",
          },
        },
        depth: 0,
        limit: 1,
        pagination: false,
      });
      expect(result).toEqual(mockDoc);
    });
  });

  describe("getGlobalVersions", () => {
    it("should fetch versions with correct parameters", async () => {
      const mockVersions = {
        docs: [{ id: "version-1" }, { id: "version-2" }],
      };
      const mockFindVersions = mockReq.payload.findVersions as jest.Mock;
      mockFindVersions.mockResolvedValue(mockVersions);

      mockReq.query = { page: "2", limit: "20", depth: "2" };

      const result = await getGlobalVersions({
        options: mockOptions,
        global: mockGlobal,
        req: mockReq as any,
      });

      expect(mockFindVersions).toHaveBeenCalledWith({
        req: mockReq,
        collection: "testGlobalGlobals",
        page: 2,
        limit: 20,
        depth: 2,
        where: {
          "version.tenant": {
            equals: "test-tenant-123",
          },
        },
        sort: "-updatedAt",
      });
      expect(result).toEqual(mockVersions);
    });
  });

  describe("getGlobalVersionById", () => {
    it("should fetch specific version by ID", async () => {
      const mockVersion = { id: "version-123" };
      const mockFindVersionByID = mockReq.payload.findVersionByID as jest.Mock;
      mockFindVersionByID.mockResolvedValue(mockVersion);

      const result = await getGlobalVersionById({
        global: mockGlobal,
        req: mockReq as any,
      });

      expect(mockFindVersionByID).toHaveBeenCalledWith({
        collection: "testGlobalGlobals",
        id: "version-123",
        req: mockReq,
      });
      expect(result).toEqual(mockVersion);
    });
  });

  describe("restoreGlobalVersion", () => {
    it("should restore version by ID", async () => {
      const mockRestoredVersion = { id: "restored-123" };
      const mockRestoreVersion = mockReq.payload.restoreVersion as jest.Mock;
      mockRestoreVersion.mockResolvedValue(mockRestoredVersion);

      const result = await restoreGlobalVersion({
        global: mockGlobal,
        req: mockReq as any,
      });

      expect(mockRestoreVersion).toHaveBeenCalledWith({
        collection: "testGlobalGlobals",
        id: "version-123",
        req: mockReq,
      });
      expect(result).toEqual(mockRestoredVersion);
    });
  });
});
