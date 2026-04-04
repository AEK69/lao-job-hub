import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Navigate, Link } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';

const ProfilePage = () => {
  const { user, role, loading, signOut } = useAuth();
  const { language } = useAppStore();
  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1 max-w-2xl">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{user.email || user.phone || 'User'}</h1>
              <div className="flex gap-2 mt-1">
                {role && <Badge>{role}</Badge>}
              </div>
            </div>
          </div>

          {role === 'admin' && (
            <Link to="/admin"><Button className="w-full mb-3">{l('ໄປ Admin', 'ไป Admin', 'Go to Admin')}</Button></Link>
          )}

          <Button variant="destructive" className="w-full gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> {l('ອອກຈາກລະບົບ', 'ออกจากระบบ', 'Sign Out')}
          </Button>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default ProfilePage;
