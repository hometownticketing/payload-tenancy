import { RequestWithTenant } from "../../src/utils/requestWithTenant";

/** Helper function to create a mock RequestWithTenant */
export const createMockRequestWithTenant = (
  user: { tenant?: { id: string } } | null,
  tenant?: { id: string },
): RequestWithTenant => {
  return {
    user,
    tenant,
    get: jest.fn(),
    header: jest.fn(),
    accepts: jest.fn(),
    acceptsCharsets: jest.fn(),
    acceptsEncodings: jest.fn(),
    acceptsLanguages: jest.fn(),
    is: jest.fn(),
    ip: "",
    ips: [],
    params: {},
    query: {},
    body: {},
    cookies: {},
    signedCookies: {},
    route: {},
    originalUrl: "",
    url: "",
    baseUrl: "",
    path: "",
    protocol: "",
    secure: false,
    method: "GET",
    httpVersion: "1.1",
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    connection: {},
    headers: {},
    res: {},
  } as unknown as RequestWithTenant;
};
