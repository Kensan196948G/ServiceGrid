declare module 'react' {
  import * as React from 'react';
  export = React;
  export as namespace React;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, ...children: any[]): any;
  export function jsxs(type: any, props: any, ...children: any[]): any;
  export function Fragment(props: { children?: any }): any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}