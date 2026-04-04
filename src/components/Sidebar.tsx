import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Settings,
  BarChart3,
  Clock,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: ('admin' | 'staff' | 'cashier')[];
}

export const Sidebar = ({ open, onClose }: { open?: boolean; onClose?: () => void }) => {
  const { userRole, signOut } = useAuth();
  const { language } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: t('Dashboard', 'Dashboard'),
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/dashboard',
      roles: ['admin', 'cashier', 'staff'],
    },
    {
      id: 'my-jobs',
      label: t('ງານຂອງຂ້ອຍ', 'My Jobs'),
      icon: <Clock className="w-5 h-5" />,
      path: '/my-jobs',
      roles: ['staff'],
    },
    {
      id: 'jobs',
      label: t('ລາຍການງານ', 'Jobs List'),
      icon: <FileText className="w-5 h-5" />,
      path: '/jobs',
      roles: ['admin', 'cashier'],
    },
    {
      id: 'payments',
      label: t('ການຈ່າຍ', 'Payments'),
      icon: <CreditCard className="w-5 h-5" />,
      path: '/payments',
      roles: ['admin', 'cashier'],
    },
    {
      id: 'staff',
      label: t('ພະນັກງານ', 'Staff'),
      icon: <Users className="w-5 h-5" />,
      path: '/staff',
      roles: ['admin'],
    },
    {
      id: 'reports',
      label: t('ລາຍງານ', 'Reports'),
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/reports',
      roles: ['admin'],
    },
    {
      id: 'settings',
      label: t('ຕັ້ງຄ່າ', 'Settings'),
      icon: <Settings className="w-5 h-5" />,
      path: '/settings',
      roles: ['admin'],
    },
  ];

  const visibleItems = navItems.filter(item => 
    userRole && item.roles.includes(userRole)
  );

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="h-full flex flex-col bg-white border-r">
      {/* Close button for mobile */}
      {open !== undefined && (
        <div className="md:hidden p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-auto"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Logo / Branding */}
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold text-primary">
          {t('WorkDay', 'WorkDay')}
        </h1>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-4">
          {visibleItems.map(item => (
            <Button
              key={item.id}
              variant={isActive(item.path) ? 'default' : 'ghost'}
              className="w-full justify-start gap-3 h-auto py-2.5"
              onClick={() => handleNavigation(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Button>
          ))}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:border-red-200"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
          {t('ອອກຈາກລະບົບ', 'Sign Out')}
        </Button>
      </div>
    </div>
  );
};

// Mobile menu toggle
export const SidebarToggle = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="md:hidden"
    >
      <Menu className="w-5 h-5" />
    </Button>
  );
};
