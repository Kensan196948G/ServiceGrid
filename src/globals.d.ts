declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VITE_API_BASE_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }

  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: any;
  }

  const global: any;
  const process: NodeJS.Process;
}

export {};