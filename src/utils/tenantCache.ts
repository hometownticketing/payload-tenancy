import { Payload } from "payload";
import { Document, Where } from "payload/types";

// Every request resolves its tenant, and tenants rarely change, so a minute of
// staleness on other servers is cheaper than a lookup per request.
const TTL_MS = 60_000;

// Misses are remembered too, and any path can produce one, so the cache needs a
// ceiling.
const MAX_ENTRIES = 5_000;

type Lookup = Promise<Document | undefined>;

interface Entry {
  lookup: Lookup;
  expiresAt: number;
}

const bySlug = new Map<string, Entry>();
const byId = new Map<string, Entry>();

const recall = (cache: Map<string, Entry>, key: string): Lookup | undefined => {
  const entry = cache.get(key);

  return entry && entry.expiresAt > Date.now() ? entry.lookup : undefined;
};

const remember = (cache: Map<string, Entry>, key: string, lookup: Lookup) => {
  if (cache.size >= MAX_ENTRIES) {
    cache.clear();
  }

  cache.set(key, { lookup, expiresAt: Date.now() + TTL_MS });

  lookup.catch(() => {
    if (cache.get(key)?.lookup === lookup) {
      cache.delete(key);
    }
  });
};

const findTenant = async ({
  payload,
  tenantCollection,
  where,
}: {
  payload: Payload;
  tenantCollection: string;
  where: Where;
}): Promise<Document | undefined> => {
  const {
    docs: [tenant],
  } = await payload.find({
    collection: tenantCollection,
    where,
    depth: 0,
    limit: 1,
    pagination: false,
  });

  return tenant;
};

export const findTenantBySlug = ({
  payload,
  tenantCollection,
  slug,
}: {
  payload: Payload;
  tenantCollection: string;
  slug: string;
}): Lookup => {
  const known = recall(bySlug, slug);

  if (known) {
    return known;
  }

  const lookup = findTenant({
    payload,
    tenantCollection,
    where: { slug: { equals: slug } },
  }).then((tenant) => {
    if (tenant) {
      remember(byId, String(tenant.id), Promise.resolve(tenant));
    }

    return tenant;
  });

  remember(bySlug, slug, lookup);

  return lookup;
};

export const findTenantById = ({
  payload,
  tenantCollection,
  id,
}: {
  payload: Payload;
  tenantCollection: string;
  id: string | number;
}): Lookup => {
  const known = recall(byId, String(id));

  if (known) {
    return known;
  }

  const lookup = findTenant({
    payload,
    tenantCollection,
    where: { id: { equals: id } },
  }).then((tenant) => {
    if (tenant) {
      remember(bySlug, tenant.slug, Promise.resolve(tenant));
    }

    return tenant;
  });

  remember(byId, String(id), lookup);

  return lookup;
};

export const forgetTenants = (): void => {
  bySlug.clear();
  byId.clear();
};
