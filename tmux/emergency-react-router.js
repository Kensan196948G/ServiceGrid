// React Router DOM v6 緊急修復版
const React = require('react');

const Routes = ({ children }) => {
  return React.createElement('div', { className: 'routes-container' }, children);
};

const Route = ({ path, element, ...props }) => {
  const currentPath = window.location.hash.slice(1) || '/';
  if (path === currentPath || (path === '/' && currentPath === '/')) {
    return element;
  }
  return null;
};

const Navigate = ({ to, replace = false }) => {
  React.useEffect(() => {
    if (replace) {
      window.location.replace('#' + to);
    } else {
      window.location.hash = to;
    }
  }, [to, replace]);
  return null;
};

const HashRouter = ({ children }) => {
  return React.createElement('div', { className: 'hash-router' }, children);
};

const Link = ({ to, children, className, ...props }) => {
  const handleClick = (e) => {
    e.preventDefault();
    window.location.hash = to;
  };
  
  return React.createElement('a', { 
    href: '#' + to, 
    onClick: handleClick,
    className: className,
    ...props 
  }, children);
};

const useNavigate = () => {
  return (to, options = {}) => {
    if (options.replace) {
      window.location.replace('#' + to);
    } else {
      window.location.hash = to;
    }
  };
};

const useLocation = () => {
  return {
    pathname: window.location.hash.slice(1) || '/',
    search: window.location.search,
    hash: window.location.hash
  };
};

const useParams = () => ({});

module.exports = {
  Routes,
  Route,
  Navigate,
  HashRouter,
  Link,
  useNavigate,
  useLocation,
  useParams
};