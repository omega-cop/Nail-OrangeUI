/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'html2canvas';

interface ImportMetaEnv {
  readonly GEMINI_API_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
