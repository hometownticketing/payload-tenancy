import { Config } from "payload/config";
import {
  CollectionAfterReadHook,
  CollectionConfig,
  Document,
  PayloadRequest,
} from "payload/types";
import { TenancyOptions } from "../options";
import { FileSize } from "payload/dist/uploads/types";
import { RequestWithTenant } from "../utils/requestWithTenant";
import { findTenantById } from "../utils/tenantCache";

const readTenantId = (value: unknown): string | number | undefined => {
  const id =
    typeof value === "object" && value !== null
      ? (value as { id?: unknown }).id
      : value;

  return typeof id === "string" || typeof id === "number" ? id : undefined;
};

const findDocumentTenant = async ({
  doc,
  req,
  collection,
  tenantCollection,
}: {
  doc: Document;
  req: PayloadRequest;
  collection: CollectionConfig;
  tenantCollection: string;
}): Promise<Document | undefined> => {
  // Re-read the raw document only when field config has kept the tenant off
  // the one being returned.
  const value =
    "tenant" in doc
      ? doc.tenant
      : (
          await req.payload.db.findOne<Document>({
            collection: collection.slug,
            where: { id: { equals: doc.id } },
            req,
          })
        )?.tenant;

  const tenantId = readTenantId(value);

  if (!tenantId) {
    return undefined;
  }

  const requestTenant = (req as RequestWithTenant).tenant;

  if (requestTenant?.id === tenantId) {
    return requestTenant;
  }

  return findTenantById({
    payload: req.payload,
    tenantCollection,
    id: tenantId,
  });
};

/**
 * Fix file URLs when using path tenant isolation strategy.
 *
 * @param args Hook args
 * @returns {Promise<void>}
 */
export const createUploadAfterReadHook =
  ({
    options: { isolationStrategy, tenantCollection },
    config: { serverURL },
    collection,
  }: {
    options: TenancyOptions;
    config: Config;
    collection: CollectionConfig;
  }): CollectionAfterReadHook =>
  async ({ doc, req }): Promise<void> => {
    const parameters =
      typeof collection.upload === "object" ? collection.upload : {};
    if (parameters.staticURL?.startsWith("/") === false) {
      // Absolute URL, don't touch it.
      return doc;
    }

    let basePath = parameters.staticURL ?? "/media";
    if (isolationStrategy === "path") {
      const tenant = await findDocumentTenant({
        doc,
        req,
        collection,
        tenantCollection,
      });

      if (!tenant) {
        return doc;
      }

      basePath = `/${tenant.slug}${basePath}`;
    }

    return {
      ...doc,
      url: `${serverURL ?? ""}${basePath}/${doc.filename}`,
      sizes: {
        ...Object.fromEntries(
          Object.entries<FileSize>(doc.sizes ?? {}).map(([name, size]) => [
            name,
            {
              ...size,
              url: `${serverURL ?? ""}${basePath}/${size.filename}`,
            },
          ]),
        ),
      },
    };
  };
