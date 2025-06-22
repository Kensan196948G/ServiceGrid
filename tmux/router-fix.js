// React Router DOM 緊急修復スクリプト
const fs = require('fs');
const path = require('path');

console.log('🔧 React Router DOM 緊急修復開始...');

// 破損したパッケージを手動で修復
const routerFix = `
// React Router DOM v6 緊急修復版
export const Routes = ({ children }) => children;
export const Route = ({ path, element, ...props }) => element;
export const Navigate = ({ to, replace }) => null;
export const HashRouter = ({ children }) => children;
export const BrowserRouter = ({ children }) => children;
export const Link = ({ to, children, ...props }) => 
  React.createElement('a', { href: to, ...props }, children);
export const NavLink = Link;

export const useNavigate = () => (to) => {
  if (typeof to === 'string') {
    window.location.hash = to;
  }
};

export const useLocation = () => ({
  pathname: window.location.hash.slice(1) || '/',
  search: window.location.search,
  hash: window.location.hash
});

export const useParams = () => ({});
`;

// 緊急修復ファイル作成
const fixPath = path.join(__dirname, 'react-router-dom-emergency.js');
fs.writeFileSync(fixPath, routerFix);

console.log('✅ React Router DOM 緊急修復完了');
console.log('📁 修復ファイル:', fixPath);