import * as React from 'react';
const { createContext, useContext, useState, useEffect } = React;
type ReactNode = React.ReactNode;

// Simple routing context
interface RouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextType>({
  currentPath: '/',
  navigate: () => {}
});

// Get current hash from URL
const getCurrentPath = () => {
  return window.location.hash.slice(1) || '/';
};

// Temporary placeholder components for react-router-dom while resolving dependency issues
export const HashRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(getCurrentPath());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getCurrentPath());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      <div data-router="hash">{children}</div>
    </RouterContext.Provider>
  );
};

export const Routes: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentPath } = useContext(RouterContext);
  
  // Find the matching route
  const routes = React.Children.toArray(children) as React.ReactElement[];
  const matchedRoute = routes.find(route => {
    if (!route?.props) return false;
    
    const path = route.props.path;
    const index = route.props.index;
    
    if (index && currentPath === '/') return true;
    if (path && currentPath === path) return true;
    if (path && path.includes && path.includes('*') && currentPath.startsWith(path.replace('/*', ''))) return true;
    
    return false;
  });

  return (
    <div data-router="routes">
      {matchedRoute || routes.find(route => route?.props?.path === '*') || routes[0]}
    </div>
  );
};

export const Route: React.FC<{ 
  path?: string; 
  element?: React.ReactNode; 
  children?: React.ReactNode;
  index?: boolean;
}> = ({ element, children }) => (
  <div data-router="route">{element || children}</div>
);

export const Navigate: React.FC<{ to: string; replace?: boolean }> = ({ to }) => {
  const { navigate } = useContext(RouterContext);
  
  useEffect(() => {
    navigate(to);
  }, [to, navigate]);

  return <div data-router="navigate" data-to={to}>Redirecting to {to}...</div>;
};

export const useNavigate = () => {
  const { navigate } = useContext(RouterContext);
  return navigate;
};

export const useLocation = () => {
  const { currentPath } = useContext(RouterContext);
  return {
    pathname: currentPath,
    search: '',
    hash: '',
    state: null,
    key: 'default'
  };
};

export const Link: React.FC<{ 
  to: string; 
  children: React.ReactNode; 
  className?: string 
}> = ({ to, children, className }) => (
  <a href={`#${to}`} className={className}>{children}</a>
);

export const NavLink: React.FC<{ 
  to: string; 
  children: React.ReactNode; 
  className?: string | ((props: { isActive: boolean }) => string);
  onClick?: () => void;
}> = ({ to, children, className, onClick }) => {
  const { currentPath } = useContext(RouterContext);
  const isActive = currentPath === to;
  const finalClassName = typeof className === 'function' ? className({ isActive }) : className;
  
  return (
    <a href={`#${to}`} className={finalClassName} onClick={onClick}>{children}</a>
  );
};