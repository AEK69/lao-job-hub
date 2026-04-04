import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'staff' | 'cashier' | ('admin' | 'staff' | 'cashier')[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, userRole } = useAuth();
  const { language } = useAppStore();
  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">⏳</div>
          <p className="text-muted-foreground">{t('ກຳລັງໂຫຼດ...', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role if specified
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!userRole || !roles.includes(userRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold mb-2">
              {t('ບໍ່ມີສິດເຂົ້າໃຊ້', 'Access Denied')}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t('ທ່ານບໍ່ມີສິດເຂົ້າໃຊ້ໜ້ານີ້', 'You do not have permission to access this page')}
            </p>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              {t('ກັບໄປທີ່ Dashboard', 'Back to Dashboard')}
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
