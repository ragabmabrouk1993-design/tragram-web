import {
  isBillingDisabledInCurrentEnv,
  isBillingDisabledInServerEnv,
  resolveCommercialModeClientEnv,
  resolveCommercialModeServerEnv,
} from "./runtime-environment";

describe("runtime-environment billing gating", () => {
  const env = process.env as Record<string, string | undefined>;
  const runtimeGlobal = globalThis as unknown as {
    document?: {
      querySelector: (selector: string) => { getAttribute: () => string } | null;
    };
    window?: {
      location: {
        hostname: string;
        origin: string;
      };
    };
  };
  const originalEnvironment = env.ENVIRONMENT;
  const originalAppEnv = env.APP_ENV;
  const originalNodeEnv = env.NODE_ENV;
  const originalNextPublicEnvironment = env.NEXT_PUBLIC_ENVIRONMENT;
  const originalNextPublicApiUrl = env.NEXT_PUBLIC_API_URL;
  const originalVisualParityMode = env.VISUAL_PARITY_MODE;
  const originalNextPublicVisualParityMode = env.NEXT_PUBLIC_VISUAL_PARITY_MODE;
  const originalCommercialMode = env.COMMERCIAL_MODE;
  const originalNextPublicCommercialMode = env.NEXT_PUBLIC_COMMERCIAL_MODE;
  const originalDocument = runtimeGlobal.document;
  const originalWindow = runtimeGlobal.window;

  beforeEach(() => {
    delete env.ENVIRONMENT;
    delete env.APP_ENV;
    env.NODE_ENV = "test";
    delete env.NEXT_PUBLIC_ENVIRONMENT;
    delete env.NEXT_PUBLIC_API_URL;
    delete env.VISUAL_PARITY_MODE;
    delete env.NEXT_PUBLIC_VISUAL_PARITY_MODE;
    delete env.COMMERCIAL_MODE;
    delete env.NEXT_PUBLIC_COMMERCIAL_MODE;
    delete runtimeGlobal.document;
    delete runtimeGlobal.window;
  });

  afterEach(() => {
    env.ENVIRONMENT = originalEnvironment;
    env.APP_ENV = originalAppEnv;
    env.NODE_ENV = originalNodeEnv;
    env.NEXT_PUBLIC_ENVIRONMENT = originalNextPublicEnvironment;
    env.NEXT_PUBLIC_API_URL = originalNextPublicApiUrl;
    env.VISUAL_PARITY_MODE = originalVisualParityMode;
    env.NEXT_PUBLIC_VISUAL_PARITY_MODE = originalNextPublicVisualParityMode;
    env.COMMERCIAL_MODE = originalCommercialMode;
    env.NEXT_PUBLIC_COMMERCIAL_MODE = originalNextPublicCommercialMode;
    if (originalDocument) {
      runtimeGlobal.document = originalDocument;
    } else {
      delete runtimeGlobal.document;
    }
    if (originalWindow) {
      runtimeGlobal.window = originalWindow;
    } else {
      delete runtimeGlobal.window;
    }
  });

  test("keeps billing enabled in staging server env", () => {
    env.ENVIRONMENT = "staging";
    env.NEXT_PUBLIC_API_URL = "https://api.staging.tragram.app/api";

    expect(isBillingDisabledInServerEnv()).toBe(false);
    expect(resolveCommercialModeServerEnv()).toBe("STANDARD_BILLING");
  });

  test("disables billing for explicit free Basic server mode even in visual parity", () => {
    env.ENVIRONMENT = "staging";
    env.COMMERCIAL_MODE = "FREE_BASIC";
    env.VISUAL_PARITY_MODE = "true";

    expect(resolveCommercialModeServerEnv()).toBe("FREE_BASIC");
    expect(isBillingDisabledInServerEnv()).toBe(true);
  });

  test("disables billing in local server env unless visual parity mode is enabled", () => {
    env.ENVIRONMENT = "local";
    env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api";

    expect(isBillingDisabledInServerEnv()).toBe(true);

    env.NEXT_PUBLIC_VISUAL_PARITY_MODE = "true";

    expect(isBillingDisabledInServerEnv()).toBe(false);
  });

  test("keeps billing enabled in staging client env", () => {
    runtimeGlobal.document = {
      querySelector: (selector: string) => {
        if (selector === 'meta[name="tragram-runtime-env"]') {
          return { getAttribute: () => "staging" };
        }
        if (selector === 'meta[name="tragram-api-url"]') {
          return { getAttribute: () => "https://api.staging.tragram.app" };
        }
        return null;
      }
    };
    runtimeGlobal.window = {
      location: {
        hostname: "staging.tragram.app",
        origin: "https://staging.tragram.app",
      }
    };

    expect(isBillingDisabledInCurrentEnv()).toBe(false);
    expect(resolveCommercialModeClientEnv()).toBe("STANDARD_BILLING");
  });

  test("reads explicit free Basic mode from runtime metadata on the client", () => {
    runtimeGlobal.document = {
      querySelector: (selector: string) => {
        if (selector === 'meta[name="tragram-commercial-mode"]') {
          return { getAttribute: () => "FREE_BASIC" };
        }
        if (selector === 'meta[name="tragram-runtime-env"]') {
          return { getAttribute: () => "staging" };
        }
        return null;
      },
    };
    runtimeGlobal.window = {
      location: {
        hostname: "staging.tragram.app",
        origin: "https://staging.tragram.app",
      },
    };

    expect(resolveCommercialModeClientEnv()).toBe("FREE_BASIC");
    expect(isBillingDisabledInCurrentEnv()).toBe(true);
  });

  test("never infers free Basic mode from a hostname", () => {
    runtimeGlobal.window = {
      location: {
        hostname: "free-basic.example.com",
        origin: "https://free-basic.example.com",
      },
    };

    expect(resolveCommercialModeClientEnv()).toBe("STANDARD_BILLING");
  });

  test("disables billing in local client env", () => {
    runtimeGlobal.document = {
      querySelector: (selector: string) => {
        if (selector === 'meta[name="tragram-runtime-env"]') {
          return { getAttribute: () => "local" };
        }
        if (selector === 'meta[name="tragram-api-url"]') {
          return { getAttribute: () => "http://localhost:3000" };
        }
        return null;
      }
    };
    runtimeGlobal.window = {
      location: {
        hostname: "localhost",
        origin: "http://localhost:3000",
      }
    };

    expect(isBillingDisabledInCurrentEnv()).toBe(true);
  });
});
