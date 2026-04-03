import { Activity, User } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

type NavigationItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

interface DashboardHeaderProps {
  activeTab?: 'monitor' | 'history' | 'settings';
}

export function DashboardHeader({ activeTab = 'monitor' }: DashboardHeaderProps) {
  const navItems: NavigationItem[] = [
    { label: 'MONITOR', href: '/monitor', isActive: activeTab === 'monitor' },
    { label: 'HISTORY', href: '/history', isActive: activeTab === 'history' },
    { label: 'SETTINGS', href: '/settings', isActive: activeTab === 'settings' },
  ];

  return (
    <header className="bg-white border-b sticky top-0 z-10" style={{ borderBottomColor: '#F3F3F3' }}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Branding */}
          <Link to="/monitor" className="flex items-center gap-2">
            <div style={{ background: '#0000FF' }} className="p-2 rounded-lg">
              <Activity className="text-white" size={24} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: '#1A1C1C' }}>
              PRECISION ARCHIVE
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-8">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.href}
                className={`text-xs font-semibold tracking-wide transition-colors ${
                  item.isActive
                    ? `border-b-2 pb-1`
                    : ''
                }`}
                style={{
                  color: item.isActive ? '#0000FF' : '#64748B',
                  borderBottomColor: item.isActive ? '#0000FF' : 'transparent'
                }}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User Profile */}
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <User style={{ color: '#64748B' }} size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
