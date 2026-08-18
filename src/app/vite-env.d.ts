/// <reference types="vite/client" />

declare global {
  const __firebase_config: any;
  const __app_id: string;
  const __initial_auth_token: string | undefined;

  interface Window {
    electronAPI?: {
      isElectron: boolean;
      print: (options?: any) => Promise<{ success: boolean; error?: string }>;
      printToPDF: (options?: any) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      savePDF: (defaultName?: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      getAppVersion: () => Promise<string>;
      platform: string;
    };
  }
}

export {};
