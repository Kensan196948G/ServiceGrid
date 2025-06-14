import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // trueに設定すると0.0.0.0でリッスンし、LAN内の他のデバイスからアクセス可能になります。
    // ポートを固定したい場合は、以下のように指定できます。
    // port: 3000, 
  },
  // esbuildのimport React from 'react'を自動挿入する挙動を無効化し、
  // React 17+ の新しいJSXトランスフォームを利用するための設定。
  // esbuildオプションはVite 2.x系で有効。Vite 3.x系以降ではjsxInjectは非推奨。
  // 今回のimportmapの構成では esm.sh/react@^19.1.0 を利用しており、
  // 新しいJSXトランスフォームがデフォルトで有効なため、通常この設定は不要です。
  // しかし、もし古いプロジェクトや特定の状況で`React is not defined`エラーが出る場合は、
  // 以下の設定が役立つことがありますが、基本的には不要です。
  /*
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  */
  // React 19の@jsxImportSourceの挙動のため、esbuildのjsxFactory, jsxFragmentは通常不要
});
