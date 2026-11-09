import { Payload } from "payload";
import { Config } from "payload/config";
import { FindGlobalArgs } from "payload/database";
import { TenancyOptions } from "../options";

const remembering = new WeakSet<object>();

/**
 * Payload reads its own copy of a global before the tenancy hooks swap in the
 * tenant's. For an isolated global nothing uses that copy beyond whether it
 * exists, and once it exists it always will, so read it once.
 */
export const rememberGlobalPlaceholders = ({
  options,
  config,
  payload,
}: {
  options: TenancyOptions;
  config: Config;
  payload: Payload;
}): void => {
  const { db } = payload;
  const isolated = new Set(
    (config.globals ?? [])
      .map(({ slug }) => slug)
      .filter((slug) => !options.sharedGlobals.includes(slug)),
  );

  if (isolated.size === 0 || remembering.has(db)) {
    return;
  }

  remembering.add(db);

  const findGlobal = db.findGlobal.bind(db);
  const placeholders = new Map<string, Record<string, unknown>>();

  db.findGlobal = async (args: FindGlobalArgs) => {
    if (!isolated.has(args.slug)) {
      return findGlobal(args);
    }

    const known = placeholders.get(args.slug);

    if (known) {
      return known;
    }

    const placeholder = await findGlobal(args);

    if (placeholder) {
      placeholders.set(args.slug, placeholder);
    }

    return placeholder;
  };
};
