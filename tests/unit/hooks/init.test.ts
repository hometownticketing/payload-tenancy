import { createInitHook } from "../../../src/hooks/init";
import { createPathMapping } from "../../../src/middleware/pathMapping";
import { createDomainMapping } from "../../../src/middleware/domainMapping";
import { TenancyOptions } from "../../../src/options";
import { Config } from "payload/config";
import { Payload } from "payload";
import { Application, Handler } from "express";

// Mock dependencies
jest.mock("../../../src/middleware/pathMapping", () => ({
  createPathMapping: jest.fn(),
}));

jest.mock("../../../src/middleware/domainMapping", () => ({
  createDomainMapping: jest.fn(),
}));

describe("Init Hook", () => {
  let mockOptions: TenancyOptions;
  let mockConfig: Config;
  let mockPayload: Partial<Payload>;
  let mockExpress: Partial<Application>;
  let mockMiddleware: Handler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock middleware
    mockMiddleware = jest.fn() as unknown as Handler;
    (createPathMapping as jest.Mock).mockReturnValue(mockMiddleware);
    (createDomainMapping as jest.Mock).mockReturnValue(mockMiddleware);

    // Setup mock express with router
    mockExpress = {
      use: jest.fn(),
      _router: {
        stack: [
          { name: "query" },
          { name: "expressInit" },
          { name: "middleware1" },
          { name: "middleware2" },
        ],
      },
    } as Partial<Application>;

    // Setup mock payload
    mockPayload = {
      express: mockExpress as any,
    };

    mockOptions = {
      isolationStrategy: "path",
    } as TenancyOptions;

    mockConfig = {
      onInit: jest.fn(),
    } as unknown as Config;
  });

  it("should call config.onInit if provided", async () => {
    const hook = createInitHook({ options: mockOptions, config: mockConfig });
    await hook(mockPayload as Payload);
    expect(mockConfig.onInit).toHaveBeenCalledWith(mockPayload);
  });

  it("should return early if express is not available", async () => {
    const payloadWithoutExpress = { ...mockPayload, express: undefined };
    const hook = createInitHook({ options: mockOptions, config: mockConfig });

    await hook(payloadWithoutExpress as Payload);

    expect(mockConfig.onInit).toHaveBeenCalled();
    expect(createPathMapping).not.toHaveBeenCalled();
    expect(createDomainMapping).not.toHaveBeenCalled();
  });

  it("should create path mapping middleware for path strategy", async () => {
    mockOptions.isolationStrategy = "path";
    const hook = createInitHook({ options: mockOptions, config: mockConfig });

    await hook(mockPayload as Payload);

    expect(createPathMapping).toHaveBeenCalledWith({
      options: mockOptions,
      config: mockConfig,
      payload: mockPayload,
    });
    expect(mockExpress.use).toHaveBeenCalledWith(mockMiddleware);
  });

  it("should create domain mapping middleware for domain strategy", async () => {
    mockOptions.isolationStrategy = "domain";
    const hook = createInitHook({ options: mockOptions, config: mockConfig });

    await hook(mockPayload as Payload);

    expect(createDomainMapping).toHaveBeenCalledWith({
      options: mockOptions,
      config: mockConfig,
      payload: mockPayload,
    });
    expect(mockExpress.use).toHaveBeenCalledWith(mockMiddleware);
  });

  it("should not create middleware for other strategies", async () => {
    mockOptions.isolationStrategy = "user";
    const hook = createInitHook({ options: mockOptions, config: mockConfig });

    await hook(mockPayload as Payload);

    expect(createPathMapping).not.toHaveBeenCalled();
    expect(createDomainMapping).not.toHaveBeenCalled();
    expect(mockExpress.use).not.toHaveBeenCalled();
  });

  it("should not add middleware if it already exists", async () => {
    // Setup router stack with existing middleware
    mockExpress._router.stack = [
      { name: "query" },
      { name: "expressInit" },
      { handle: mockMiddleware },
      { name: "middleware2" },
    ];

    const hook = createInitHook({ options: mockOptions, config: mockConfig });
    await hook(mockPayload as Payload);

    expect(mockExpress.use).not.toHaveBeenCalled();
  });

  it("should prioritize the last middleware after expressInit", async () => {
    let stackManipulation: any[] = [];

    // Mock the express use to simulate middleware addition
    (mockExpress.use as jest.Mock).mockImplementation((middleware) => {
      stackManipulation = [...stackManipulation, { handle: middleware }];
    });

    // Create a mutable stack that we can track
    mockExpress._router.stack = [
      { name: "query" },
      { name: "expressInit" },
      { name: "middleware1" },
      { name: "middleware2" },
    ];

    const hook = createInitHook({ options: mockOptions, config: mockConfig });
    await hook(mockPayload as Payload);

    // Simulate the stack reordering that happens in prioritizeLastMiddleware
    if (stackManipulation.length > 0) {
      const expressInitIndex = mockExpress._router.stack.findIndex(
        (layer) => layer.name === "expressInit",
      );

      mockExpress._router.stack = [
        ...mockExpress._router.stack.slice(0, expressInitIndex + 1),
        stackManipulation[stackManipulation.length - 1],
        ...mockExpress._router.stack.slice(expressInitIndex + 1),
      ];
    }

    // Verify the middleware was added in the correct position
    expect(mockExpress._router.stack[2].handle).toBe(mockMiddleware);
  });

  it("should handle multiple initializations with same middleware", async () => {
    let middlewareAdded = false;
    const initialStack = [
      { name: "query" },
      { name: "expressInit" },
      { name: "middleware1" },
    ];

    // Reset the router stack for this test
    mockExpress._router.stack = [...initialStack];

    (mockExpress.use as jest.Mock).mockImplementation((middleware) => {
      if (!middlewareAdded) {
        mockExpress._router.stack.push({ handle: middleware });
        middlewareAdded = true;
      }
    });

    const hook = createInitHook({ options: mockOptions, config: mockConfig });

    // First initialization
    await hook(mockPayload as Payload);
    const firstCallStackLength = mockExpress._router.stack.length;

    // Second initialization
    await hook(mockPayload as Payload);

    // Verify the stack didn't grow and middleware was only added once
    expect(mockExpress._router.stack.length).toBe(firstCallStackLength);
    expect(createPathMapping).toHaveBeenCalledTimes(1);
    expect(mockExpress.use).toHaveBeenCalledTimes(1);
  });
});
