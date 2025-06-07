import React, { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from './RouterPlaceholder';
import { useAuth } from '../contexts/AuthContext';
import { NAVIGATION_ITEMS, APP_NAME } from '../constants';
import { Button } from './CommonUI';
import { userRoleToJapanese } from '../localization';

const UserCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
  </svg>
);

const Bars3Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const XMarkIcon = () => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
</svg>
);


const Sidebar: React.FC<{isOpen: boolean; toggleSidebar: () => void;}> = ({isOpen, toggleSidebar}) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 z-20 bg-black opacity-50 lg:hidden" onClick={toggleSidebar}></div>}
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-800 text-slate-100 p-4 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        <div className="text-2xl font-bold mb-6 text-center text-white flex items-center justify-center">
          {APP_NAME.split(' ')[0]} {/* Short name */}
        </div>
        <nav className="flex-grow overflow-y-auto"> {/* Added overflow-y-auto for long lists */}
          <ul>
            {NAVIGATION_ITEMS.map((item) => (
              <li key={item.name} className="mb-1.5"> {/* Reduced margin slightly */}
                <NavLink
                  to={item.path}
                  onClick={() => {if(window.innerWidth < 1024) toggleSidebar()}} // Close sidebar on mobile nav click
                  className={({ isActive }) =>
                    `flex items-start p-3 rounded-md hover:bg-slate-700 transition-colors ${ // items-start for multi-line
                      isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
                    }`
                  }
                >
                  {item.icon} {/* Icon already has mr-3 */}
                  <div className="flex-1"> {/* Text content wrapper */}
                    <span className="block text-sm leading-tight">{item.name}</span>
                    {item.description && <span className="block text-xs text-slate-400 mt-0.5 leading-tight">{item.description}</span>}
                  </div>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto pt-4"> {/* Added padding top */}
          <p className="text-xs text-slate-400 text-center">&copy; {new Date().getFullYear()} ITSM プラットフォーム</p>
        </div>
      </aside>
    </>
  );
};

const Header: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-slate-600 lg:hidden mr-4">
          <Bars3Icon />
        </button>
        <h1 className="text-xl font-semibold text-slate-800 hidden md:block">{APP_NAME}</h1>
      </div>
      
      <div className="relative">
        <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center text-slate-600 hover:text-blue-600 focus:outline-none">
          <UserCircleIcon />
          {user && <span className="ml-2 hidden md:inline">{user.username} ({userRoleToJapanese(user.role)})</span>}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-1 hidden md:inline">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
            <button
              onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              プロファイル設定
            </button>
            <Button
              onClick={handleLogout}
              variant='ghost'
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 !border-0"
            >
              ログアウト
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar}/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};