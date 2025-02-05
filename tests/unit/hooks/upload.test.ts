import { createUploadAfterReadHook } from "../../../src/hooks/upload";
import { TenancyOptions } from "../../../src/options";
import { Config } from "payload/config";
import { CollectionConfig, PayloadRequest } from "payload/types";

describe("Upload Hooks", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockCollection: CollectionConfig;
  let mockReq: Partial<PayloadRequest>;

  beforeEach(() => {
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
        findByID: jest.fn(),
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

      (mockReq.payload.findByID as jest.Mock).mockResolvedValue({
        slug: "org1",
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

      (mockReq.payload.findByID as jest.Mock).mockResolvedValue({
        slug: "org1",
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

      (mockReq.payload.findByID as jest.Mock).mockResolvedValue({
        slug: "org1",
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
