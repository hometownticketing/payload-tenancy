import { parse } from "graphql/language";
import {
  AfterChangeHook,
  BeforeChangeHook,
  BeforeReadHook,
  GlobalConfig,
} from "payload/dist/globals/config/types";
import { RequestWithTenant } from "../utils/requestWithTenant";
import { TenancyOptions } from "../options";
import { Config } from "payload/config";
import { PayloadRequest } from "payload/types";
import { findQueryByName, findArgumentByName } from "../utils/graphql";

export const createGlobalBeforeReadHook =
  ({
    options,
    config,
    global,
  }: {
    options: TenancyOptions;
    config: Config;
    global: GlobalConfig;
  }): BeforeReadHook =>
  async ({ req }) => {
    const doc = await getGlobal({
      options,
      config,
      global,
      req,
    });

    if (!doc) {
      return await initGlobal({ options, config, global, req });
    }

    return doc;
  };

export const createGlobalBeforeChangeHook =
  ({
    options,
    config,
    global,
  }: {
    options: TenancyOptions;
    config: Config;
    global: GlobalConfig;
  }): BeforeChangeHook =>
  async ({ data, req }) => {
    const doc = await getGlobal({
      options,
      config,
      global,
      req,
      draft: true,
    });

    if (!doc) {
      await initGlobal({ options, config, global, req, data });
    } else {
      await updateGlobal({ options, config, global, req, data });
    }

    return {};
  };

export const createGlobalAfterChangeHook =
  ({
    options,
    config,
    global,
  }: {
    options: TenancyOptions;
    config: Config;
    global: GlobalConfig;
  }): AfterChangeHook =>
  ({ req }) =>
    getGlobal({
      options,
      config,
      global,
      req,
      draft: true,
    });

const extractTenantId = ({
  req,
}: {
  options: TenancyOptions;
  req: PayloadRequest;
}) => {
  const tenantId =
    (req as RequestWithTenant).tenant?.id ??
    (req as RequestWithTenant).tenant ??
    req.user?.tenant?.id ??
    req.user?.tenant;
  if (!tenantId) {
    throw new Error(
      "Could not determine tenant." +
        " You can select tenant by setting it in user object when using Local API.",
    );
  }
  return tenantId;
};

const initGlobal = ({
  options,
  global,
  req,
  data,
}: {
  options: TenancyOptions;
  config: Config;
  global: GlobalConfig;
  req: PayloadRequest;
  data?: Record<string, unknown>;
}) =>
  req.payload.create({
    req,
    collection: global.slug + "Globals",
    data: {
      ...(data ?? {}),
      tenant: extractTenantId({ options, req }),
    },
  });

const updateGlobal = ({
  options,
  global,
  req,
  data,
}: {
  options: TenancyOptions;
  config: Config;
  global: GlobalConfig;
  req: PayloadRequest;
  data?: Record<string, unknown>;
}) =>
  req.payload.update({
    req,
    collection: global.slug + "Globals",
    where: {
      tenant: {
        equals: extractTenantId({ options, req }),
      },
    },
    data: {
      ...(data ?? {}),
      tenant: extractTenantId({ options, req }),
    },
  });

const getGlobal = async ({
  options,
  global,
  req,
  draft,
}: {
  options: TenancyOptions;
  config: Config;
  global: GlobalConfig;
  req: PayloadRequest;
  draft?: boolean;
}) => {
  const globalCollection = global.slug + "Globals";
  const { payload } = req;
  const tenantId = extractTenantId({ options, req });
  let isDraft = draft;

  if (draft === undefined) {
    if (req.payloadAPI === "GraphQL") {
      const queryDoc = parse(req.body.query);
      const gqlTypes = getQueryNameOfGlobal(req, global.slug);
      if (gqlTypes?.type) {
        const gqlQuery = findQueryByName(queryDoc, gqlTypes.type);
        if (gqlQuery) {
          isDraft = Boolean(
            findArgumentByName(gqlQuery, req.body.variables, "draft"),
          );
        }
      }
    } else {
      isDraft = ["1", "true"].includes(req?.query?.draft?.toString());
    }
  }

  const {
    docs: [doc],
  } = await payload.find({
    req,
    collection: globalCollection,
    where: {
      tenant: {
        equals: tenantId,
      },
    },
    depth: 0,
    limit: 1,
    pagination: false,
  });

  if (!isDraft && doc?._status === "draft") {
    const {
      docs: [latestPublishedVersion],
    } = await payload.findVersions({
      req,
      collection: globalCollection,
      where: {
        "version.tenant": {
          equals: tenantId,
        },
        "version._status": {
          equals: "published",
        },
      },
      depth: 0,
      limit: 1,
      sort: "-updatedAt",
    });

    if (latestPublishedVersion?.version) {
      return latestPublishedVersion?.version;
    }
  }
  return doc;
};

interface GlobalGraphQLTypes {
  type?: string;
  versionType: string;
}

const globalToTypes: Record<string, GlobalGraphQLTypes> = {};
const getQueryNameOfGlobal = (
  req: PayloadRequest,
  slug: string,
): GlobalGraphQLTypes | undefined => {
  const {
    payload: { globals },
  } = req;

  if (globalToTypes[slug]) return globalToTypes[slug];

  for (const i in globals.config) {
    if (globals.config[i].slug === slug) {
      const gql = globals.graphQL?.[i];
      const types = {
        type: gql?.type?.name,
        versionType: gql?.versionType?.name,
      };

      globalToTypes[slug] = types;
      return types;
    }
  }
};
