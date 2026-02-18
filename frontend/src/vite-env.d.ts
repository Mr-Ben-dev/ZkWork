/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_ALEO_PROGRAM_ID: string;
  readonly VITE_MUX_STREAM_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
