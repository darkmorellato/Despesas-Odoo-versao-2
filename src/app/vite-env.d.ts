/// <reference types="vite/client" />

declare global {
  const __firebase_config: any;
  const __app_id: string;
  const __initial_auth_token: string | undefined;
}

export {};
