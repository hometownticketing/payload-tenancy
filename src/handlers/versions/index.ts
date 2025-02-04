import {
  getGlobalVersions,
  getGlobalVersionById,
  restoreGlobalVersion,
} from "../../hooks/global";
import { handleError } from "../errorHandler";
import { GlobalConfig } from "payload/dist/globals/config/types";
import { TenancyOptions } from "../../options";
import { Endpoint } from "payload/config";

export const createGetVersionsRoute = (
  options: TenancyOptions,
  global: GlobalConfig,
): Omit<Endpoint, "root"> => ({
  path: "/versions/",
  method: "get",
  handler: async (req, res) => {
    try {
      const versions = await getGlobalVersions({
        options,
        global,
        req,
      });
      res.status(200).json(versions);
    } catch (error) {
      handleError(error, res, "fetch versions");
    }
  },
});

export const createGetVersionByIdRoute = (
  global: GlobalConfig,
): Omit<Endpoint, "root"> => ({
  path: "/versions/:id",
  method: "get",
  handler: async (req, res) => {
    try {
      if (!req.params.id) {
        return res.status(400).json({ error: "Version ID is required" });
      }

      const version = await getGlobalVersionById({
        global,
        req,
      });

      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }

      res.status(200).json(version);
    } catch (error) {
      handleError(error, res, "fetch version");
    }
  },
});

export const createRestoreVersionRoute = (
  global: GlobalConfig,
): Omit<Endpoint, "root"> => ({
  path: "/versions/:id",
  method: "post",
  handler: async (req, res) => {
    try {
      if (!req.params.id) {
        return res.status(400).json({ error: "Version ID is required" });
      }

      const version = await restoreGlobalVersion({
        global,
        req,
      });

      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }

      res.status(200).json(version);
    } catch (error) {
      handleError(error, res, "restore version");
    }
  },
});
