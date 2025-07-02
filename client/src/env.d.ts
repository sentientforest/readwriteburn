/// <reference types="vite/client" />

import type { BrowserConnectClient } from "@gala-chain/connect";

interface ImportMetaEnv {
  readonly VITE_PROJECT_API: string; // Local server API - proxies all blockchain and identity operations
  readonly VITE_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $metamaskClient: BrowserConnectClient | null;
  }
}
