declare module '@testing-library/jest-dom' {
  export function toBeInTheDocument(): any;
  export function toHaveClass(className: string): any;
  export function toHaveTextContent(text: string): any;
  export function toBeVisible(): any;
  export function toBeDisabled(): any;
  export function toBeEnabled(): any;
}

declare namespace jest {
  interface Matchers<R> {
    toBeInTheDocument(): R;
    toHaveClass(className: string): R;
    toHaveTextContent(text: string): R;
    toBeVisible(): R;
    toBeDisabled(): R;
    toBeEnabled(): R;
  }
}

declare var jest: {
  fn: (implementation?: any) => any;
  mock: (moduleName: string, implementation?: any) => any;
  unmock: (moduleName: string) => any;
  clearAllMocks: () => void;
  resetAllMocks: () => void;
  restoreAllMocks: () => void;
  spyOn: (object: any, method: string) => any;
};

declare var global: any;