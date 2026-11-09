import { createUploadAfterReadHook } from "../../../src/hooks/upload";
import { TenancyOptions } from "../../../src/options";
import { Config } from "payload/config";
import { CollectionConfig, PayloadRequest } from "payload/types";
import { forgetTenants } from "../../../src/utils/tenantCache";

describe("Upload Hooks", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockCollection: CollectionConfig;
  let mockReq: Partial<PayloadRequest>;

  beforeEach(() => {
    forgetTenants();

    mockOptions = {
      isolationStrategy: "path",
      tenantCollection: "tenants",
    } as TenancyOptions;

    mockConfig = {
      serverURL: "http://localhost:3000",
    } as Config;

    mockCollection = {
      slug: "media",
      upload: {
        staticURL: "/media",
      },
    } as CollectionConfig;

    mockReq = {
      payload: {
        db: {
          findOne: jest.fn(),
        },
        find: jest.fn(),
      },
    } as unknown as Partial<PayloadRequest>;
  });

  describe("createUploadAfterReadHook", () => {
    it("should not modify URLs for absolute staticURL", async () => {
      const collectionWithAbsoluteURL = {
        ...mockCollection,
        upload: {
          staticURL: "https://cdn.example.com",
        },
      };

      const hook = createUploadAfterReadHook({
        options: mockOptions,
        config: mockConfig,
        collection: collectionWithAbsoluteURL,
      });

      const doc = {
        id: "test-1",
        filename: "test.jpg",
        url: "https://cdn.example.com/test.jpg",
      };

      const result = await hook({
        doc,
        req: mockReq as any,
        context: undefined,
        collection: undefined,
      });

      expect(result).toBe(doc);
      expect(mockReq.payload.db.findOne).not.toHaveBeenCalled();
    });

    it("should handle missing upload configuration", async () => {
      const collectionWithoutUpload = {
        ...mockCollection,
        upload: true,
      };

      const hook = createUploadAfterReadHook({
        options: mockOptions,
        config: mockConfig,
        collection: collectionWithoutUpload,
      });

      const doc = {
        id: "test-1",
        filename: "test.jpg",
      };

      (mockReq.payload.db.findOne as jest.Mock).mockResolvedValue({
        tenant: "tenant-1",
      });

      (mockReq.payload.find as jest.Mock).mockResolvedValue({
        docs: [{ id: "tenant-1", slug: "org1" }],
      });

      const result = await hook({
        doc,
        req: mockReq as any,
        context: undefined,
        collection: undefined,
      });

      expect(result.url).toBe("http://localhost:3000/org1/media/test.jpg");
    });

    it("should modify URLs for path isolation strategy", async () => {
      const hook = createUploadAfterReadHook({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      });

      const doc = {
        id: "test-1",
        filename: "test.jpg",
        sizes: {
          thumbnail: {
            filename: "test-thumb.jpg",
            url: "/media/test-thumb.jpg",
          },
          large: {
            filename: "test-large.jpg",
            url: "/media/test-large.jpg",
          },
        },
      };

      (mockReq.payload.db.findOne as jest.Mock).mockResolvedValue({
        tenant: "tenant-1",
      });

      (mockReq.payload.find as jest.Mock).mockResolvedValue({
        docs: [{ id: "tenant-1", slug: "org1" }],
      });

      const result = await hook({
        doc,
        req: mockReq as any,
        context: undefined,
        collection: undefined,
      });

      expect(result.url).toBe("http://localhost:3000/org1/media/test.jpg");
      expect(result.sizes.thumbnail.url).toBe(
        "http://localhost:3000/org1/media/test-thumb.jpg",
      );
      expect(result.sizes.large.url).toBe(
        "http://localhost:3000/org1/media/test-large.jpg",
      );
    });

    it("should return original doc if tenant lookup fails", async () => {
      const hook = createUploadAfterReadHook({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      });

      const doc = {
        id: "test-1",
        filename: "test.jpg",
      };

      (mockReq.payload.db.findOne as jest.Mock).mockResolvedValue(null);

      const result = await hook({
        doc,
        req: mockReq as any,
        context: undefined,
        collection: undefined,
      });

      expect(result).toBe(doc);
    });

    it("should handle missing tenant property", async () => {
      const hook = createUploadAfterReadHook({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      });

      const doc = {
        id: "test-1",
        filename: "test.jpg",
      };

      (mockReq.payload.db.findOne as jest.Mock).mockResolvedValue({
        id: "test-1",
        // no tenant property
      });

      const result = await hook({
        doc,
        req: mockReq as any,
        context: undefined,
        collection: undefined,
      });

      expect(result).toBe(doc);
    });

    it.each([
      { shape: "an id", tenant: "tenant-1" },
      { shape: "a populated tenant", tenant: { id: "tenant-1", slug: "org1" } },
    ])(
      "should read the tenant off the doc when it is $shape",
      async ({ tenant }) => {
        const hook = createUploadAfterReadHook({
          options: mockOptions,
          config: mockConfig,
          collection: mockCollection,
        });

        (mockReq.payload.find as jest.Mock).mockResolvedValue({
          docs: [{ id: "tenant-1", slug: "org1" }],
        });

        const result = await hook({
          doc: { id: "test-1", filename: "test.jpg", tenant },
          req: mockReq as unknown as PayloadRequest,
          context: undefined,
          collection: undefined,
        });

        expect(result.url).toBe("http://localhost:3000/org1/media/test.jpg");
        expect(mockReq.payload.db.findOne).not.toHaveBeenCalled();
      },
    );

    it("should use the request's tenant without looking it up", async () => {
      const hook = createUploadAfterReadHook({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      });

      const req = { ...mockReq, tenant: { id: "tenant-1", slug: "org1" } };

      const result = await hook({
        doc: { id: "test-1", filename: "test.jpg", tenant: "tenant-1" },
        req: req as unknown as PayloadRequest,
        context: undefined,
        collection: undefined,
      });

      expect(result.url).toBe("http://localhost:3000/org1/media/test.jpg");
      expect(mockReq.payload.find).not.toHaveBeenCalled();
    });

    it("should look up a tenant other than the request's", async () => {
      const hook = createUploadAfterReadHook({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      });

      const req = { ...mockReq, tenant: { id: "tenant-2", slug: "org2" } };

      (mockReq.payload.find as jest.Mock).mockResolvedValue({
        docs: [{ id: "tenant-1", slug: "org1" }],
      });

      const result = await hook({
        doc: { id: "test-1", filename: "test.jpg", tenant: "tenant-1" },
        req: req as unknown as PayloadRequest,
        context: undefined,
        collection: undefined,
      });

      expect(result.url).toBe("http://localhost:3000/org1/media/test.jpg");
    });

    it("should return original doc if the tenant no longer exists", async () => {
      const hook = createUploadAfterReadHook({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      });

      const doc = { id: "test-1", filename: "test.jpg", tenant: "tenant-1" };

      (mockReq.payload.find as jest.Mock).mockResolvedValue({ docs: [] });

      const result = await hook({
        doc,
        req: mockReq as unknown as PayloadRequest,
        context: undefined,
        collection: undefined,
      });

      expect(result).toBe(doc);
    });

    it("should handle non-path isolation strategy", async () => {
      mockOptions.isolationStrategy = "domain";

      const hook = createUploadAfterReadHook({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      });

      const doc = {
        id: "test-1",
        filename: "test.jpg",
      };

      const result = await hook({
        doc,
        req: mockReq as any,
        context: undefined,
        collection: undefined,
      });

      expect(result.url).toBe("http://localhost:3000/media/test.jpg");
      expect(mockReq.payload.db.findOne).not.toHaveBeenCalled();
    });

    it("should handle missing serverURL", async () => {
      mockConfig.serverURL = undefined;

      const hook = createUploadAfterReadHook({
        options: mockOptions,
        config: mockConfig,
        collection: mockCollection,
      });

      const doc = {
        id: "test-1",
        filename: "test.jpg",
      };

      (mockReq.payload.db.findOne as jest.Mock).mockResolvedValue({
        tenant: "tenant-1",
      });

      (mockReq.payload.find as jest.Mock).mockResolvedValue({
        docs: [{ id: "tenant-1", slug: "org1" }],
      });

      const result = await hook({
        doc,
        req: mockReq as any,
        context: undefined,
        collection: undefined,
      });

      expect(result.url).toBe("/org1/media/test.jpg");
    });
  });
});
