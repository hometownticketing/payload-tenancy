import { Payload } from "payload";
import { Config } from "payload/config";
import { FindGlobalArgs } from "payload/database";
import { rememberGlobalPlaceholders } from "../../../src/utils/globalPlaceholders";
import { TenancyOptions } from "../../../src/options";

const options = { sharedGlobals: ["shared"] } as unknown as TenancyOptions;

const config = {
  globals: [{ slug: "settings" }, { slug: "shared" }],
} as unknown as Config;

const argsFor = (slug: string) =>
  ({ slug, req: {} }) as unknown as FindGlobalArgs;

const buildPayload = (placeholder: unknown) => {
  const findGlobal = jest.fn().mockResolvedValue(placeholder);
  const payload = { db: { findGlobal } } as unknown as Payload;

  return { payload, findGlobal };
};

describe("rememberGlobalPlaceholders", () => {
  it("should read an isolated global's placeholder once it exists", async () => {
    const { payload, findGlobal } = buildPayload({ globalType: "settings" });
    rememberGlobalPlaceholders({ options, config, payload });

    await payload.db.findGlobal(argsFor("settings"));
    const placeholder = await payload.db.findGlobal(argsFor("settings"));

    expect(placeholder).toEqual({ globalType: "settings" });
    expect(findGlobal).toHaveBeenCalledTimes(1);
  });

  it("should keep reading an isolated global's placeholder until it exists", async () => {
    const { payload, findGlobal } = buildPayload(null);
    rememberGlobalPlaceholders({ options, config, payload });

    await payload.db.findGlobal(argsFor("settings"));
    await payload.db.findGlobal(argsFor("settings"));

    expect(findGlobal).toHaveBeenCalledTimes(2);
  });

  it("should read a shared global every time", async () => {
    const { payload, findGlobal } = buildPayload({ globalType: "shared" });
    rememberGlobalPlaceholders({ options, config, payload });

    await payload.db.findGlobal(argsFor("shared"));
    await payload.db.findGlobal(argsFor("shared"));

    expect(findGlobal).toHaveBeenCalledTimes(2);
  });

  it("should leave the database alone when every global is shared", () => {
    const { payload, findGlobal } = buildPayload(null);
    const allShared = {
      sharedGlobals: ["settings", "shared"],
    } as unknown as TenancyOptions;

    rememberGlobalPlaceholders({ options: allShared, config, payload });

    expect(payload.db.findGlobal).toBe(findGlobal);
  });

  it("should wrap the database only once", () => {
    const { payload } = buildPayload(null);
    rememberGlobalPlaceholders({ options, config, payload });
    const wrapped = payload.db.findGlobal;

    rememberGlobalPlaceholders({ options, config, payload });

    expect(payload.db.findGlobal).toBe(wrapped);
  });
});
