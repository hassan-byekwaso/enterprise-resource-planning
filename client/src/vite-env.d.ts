/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CURRENCY?: string;
  readonly VITE_LOCALE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
