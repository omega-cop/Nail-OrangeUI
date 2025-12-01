declare module 'html2canvas';

interface ImportMetaEnv {
  readonly GEMINI_API_KEY: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    GEMINI_API_KEY: string;
    [key: string]: any;
  }
}
