import "@testing-library/jest-dom";
import { vi } from "vitest";

declare global {
  // Helper used by Vite SSR transforms; define a minimal no-op implementation
  // so that modules compiled by rolldown-vite can run inside Vitest.
  // eslint-disable-next-line no-var
  var __vite_ssr_exportName__: (mod: unknown, key: string, alias: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.__vite_ssr_exportName__ = (mod: any, key: string, alias: string) => {
  if (mod && Object.prototype.hasOwnProperty.call(mod, key)) {
    mod[alias] = mod[key];
  }
};

// Mock the problematic ES module to prevent jsdom loading errors
vi.mock("@exodus/bytes/encoding-lite.js", () => ({
  default: {},
}));
