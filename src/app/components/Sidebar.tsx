'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckSquare, 
  FileText, 
  FolderOpen, 
  LogOut,
  Home
} from 'lucide-react';
import EntitySwitcher from './EntitySwitcher';

const navigation = [
  {
    name: 'Checklist',
    href: '/',
    icon: CheckSquare,
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: FileText,
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: FolderOpen,
  },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/register' });
  };

  // Don't show sidebar on register page
  if (pathname === '/register') {
    return null;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">LOGO</span>
        </Link>
      </div>

      {/* Entity Switcher */}
      <div className="border-b border-gray-100">
        <EntitySwitcher />
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout Section */}
      <div className="p-4 border-t border-gray-100">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-gray-900">{session.user?.name || 'User'}</p>
          <p className="text-xs text-gray-500">{session.user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-5 h-5 text-gray-500" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
