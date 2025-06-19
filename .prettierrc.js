module.exports = {
  // コード整形基本設定
  semi: true,                          // セミコロン必須
  trailingComma: 'es5',               // ES5互換trailing comma
  singleQuote: true,                  // シングルクォート使用
  tabWidth: 2,                        // インデント2スペース
  useTabs: false,                     // スペース使用
  
  // JSX/React設定
  jsxSingleQuote: true,               // JSXでシングルクォート
  jsxBracketSameLine: false,          // JSX要素の>を次行に
  
  // 改行設定
  printWidth: 100,                    // 行長100文字
  endOfLine: 'lf',                    // LF改行コード
  
  // オブジェクト設定
  bracketSpacing: true,               // {foo} スペース有り
  arrowParens: 'avoid',               // 単一引数で()省略
  
  // ファイル別設定
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    {
      files: ['*.ts', '*.tsx'],
      options: {
        parser: 'typescript',
        printWidth: 100,
        tabWidth: 2
      }
    }
  ]
};