import * as React from 'react';
const { useState, memo, useCallback, useEffect, useRef } = React;
type ReactNode = React.ReactNode;
import { NavLink, useNavigate } from './RouterPlaceholder';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';

// Enhanced navigation items with dashboard first
const NAVIGATION_ITEMS = [
  { path: '/dashboard', label: 'ダッシュボード', icon: '📊' },
  { path: '/incidents', label: 'インシデント管理', icon: '🚨' },
  { path: '/requests', label: 'サービス要求', icon: '📝' },
  { path: '/assets', label: '資産管理', icon: '💻' },
  { path: '/change-management', label: '変更管理', icon: '🔄' },
  { path: '/knowledge', label: 'ナレッジ管理', icon: '📚' },
  { path: '/settings', label: 'システム設定', icon: '⚙️' },
];
import { Button } from './CommonUI';
import { userRoleToJapanese } from '../localization';

const UserCircleIcon = memo(() => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className="w-6 h-6"
    aria-hidden="true"
  >
    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
  </svg>
));
UserCircleIcon.displayName = 'UserCircleIcon';

const Bars3Icon = memo(() => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className="w-6 h-6"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
));
Bars3Icon.displayName = 'Bars3Icon';

const XMarkIcon = memo(() => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className="w-6 h-6"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
));
XMarkIcon.displayName = 'XMarkIcon';


interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar = memo<SidebarProps>(({ isOpen, toggleSidebar }) => {
  const sidebarRef = useRef<HTMLElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      // Focus first navigation item when sidebar opens on mobile
      setTimeout(() => {
        firstLinkRef.current?.focus();
      }, 300); // Wait for animation to complete
    }
  }, [isOpen]);

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && window.innerWidth < 1024) {
        toggleSidebar();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, toggleSidebar]);

  const handleNavClick = useCallback(() => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  }, [toggleSidebar]);

  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      toggleSidebar();
    }
  }, [toggleSidebar]);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black opacity-50 lg:hidden" 
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}
      
      <aside 
        ref={sidebarRef}
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-800 text-slate-100 p-4 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}
        role="navigation"
        aria-label="メインナビゲーション"
        aria-hidden={!isOpen && window.innerWidth < 1024 ? 'true' : 'false'}
      >
        <div className="text-2xl font-bold mb-6 text-center text-white flex items-center justify-center">
          <h2 className="sr-only">アプリケーション名</h2>
          {APP_NAME.split(' ')[0]}
        </div>
        
        <nav className="flex-grow overflow-y-auto" role="navigation" aria-label="主要機能">
          <ul role="list">
            {NAVIGATION_ITEMS.map((item, index) => (
              <li key={item.name} className="mb-1.5">
                <NavLink
                  ref={index === 0 ? firstLinkRef : undefined}
                  to={item.path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-start p-3 rounded-md hover:bg-slate-700 focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors ${
                      isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
                    }`
                  }
                  aria-current={({ isActive }) => isActive ? 'page' : undefined}
                  aria-describedby={item.description ? `nav-desc-${index}` : undefined}
                >
                  <span className="flex-shrink-0 mr-3" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm leading-tight truncate">{item.name}</span>
                    {item.description && (
                      <span 
                        id={`nav-desc-${index}`}
                        className="block text-xs text-slate-400 mt-0.5 leading-tight truncate"
                      >
                        {item.description}
                      </span>
                    )}
                  </div>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <footer className="mt-auto pt-4">
          <p className="text-xs text-slate-400 text-center" role="contentinfo">
            &copy; {new Date().getFullYear()} ITSM プラットフォーム
          </p>
        </footer>
      </aside>
    </>
  );
});
Sidebar.displayName = 'Sidebar';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = memo<HeaderProps>(({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const toggleDropdown = useCallback(() => {
    setDropdownOpen(prev => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
  }, []);

  const handleSettingsClick = useCallback(() => {
    navigate('/settings');
    closeDropdown();
  }, [navigate, closeDropdown]);

  const handleSidebarToggle = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false);
        userButtonRef.current?.focus();
      }
    };

    if (dropdownOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [dropdownOpen]);

  return (
    <header 
      className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10"
      role="banner"
    >
      <div className="flex items-center">
        <button 
          onClick={handleSidebarToggle} 
          className="text-slate-600 lg:hidden mr-4 p-1 rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="メニューを開く"
          aria-expanded={false}
          aria-controls="sidebar"
        >
          <Bars3Icon />
        </button>
        <h1 className="text-xl font-semibold text-slate-800 hidden md:block">
          {APP_NAME}
        </h1>
      </div>
      
      <div className="relative" ref={dropdownRef}>
        <button 
          ref={userButtonRef}
          onClick={toggleDropdown} 
          className="flex items-center text-slate-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
          aria-label={user ? `ユーザーメニュー: ${user.username}` : 'ユーザーメニュー'}
        >
          <UserCircleIcon />
          {user && (
            <>
              <span className="ml-2 hidden md:inline">
                {user.username} ({userRoleToJapanese(user.role)})
              </span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor" 
                className="w-5 h-5 ml-1 hidden md:inline"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </>
          )}
        </button>
        
        {dropdownOpen && (
          <div 
            className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-slate-200"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
          >
            <button
              onClick={handleSettingsClick}
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
              role="menuitem"
            >
              プロファイル設定
            </button>
            <Button
              onClick={handleLogout}
              variant='ghost'
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 !border-0 !ring-0 justify-start"
              role="menuitem"
            >
              ログアウト
            </Button>
          </div>
        )}
      </div>
    </header>
  );
});
Header.displayName = 'Header';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = memo<MainLayoutProps>(({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Close sidebar when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main 
          className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-6"
          role="main"
          aria-label="メインコンテンツ"
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
});
MainLayout.displayName = 'MainLayout';