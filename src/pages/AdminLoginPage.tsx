import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Shield, ArrowRight } from 'lucide-react';

const AdminLoginPage = () => {
  const { language } = useAppStore();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const l = (lo: string, th: string, en: string) =>
    language === 'en' ? en : language === 'th' ? th : lo;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="animate-pulse text-2xl">⏳</span>
      </div>
    );
  }

  // If already logged in, check if admin and redirect appropriately
  if (user) {
    return <AdminGate />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Verify admin role
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: data.user!.id,
        _role: 'admin',
      });
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error(l('ບັນຊີນີ້ບໍ່ແມ່ນ Admin', 'บัญชีนี้ไม่ใช่ Admin', 'This account is not an admin'));
        return;
      }
      toast.success(l('ຍິນດີຕ້ອນຮັບ Admin!', 'ยินดีต้อนรับ Admin!', 'Welcome Admin!'));
      navigate('/admin');
    } catch (err: any) {
      toast.error(err.message || l('ເຂົ້າສູ່ລະບົບລົ້ມເຫລວ', 'เข้าสู่ระบบล้มเหลว', 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="w-full max-w-md p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <Shield className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">
                {l('ເຂົ້າສູ່ລະບົບ Admin', 'เข้าสู่ระบบ Admin', 'Admin Login')}
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                {l('ສະເພາະບັນຊີທີ່ໄດ້ຮັບສິດ Admin', 'เฉพาะบัญชีที่ได้รับสิทธิ์ Admin', 'Only accounts with admin role')}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email}
                  onChange={e => setEmail(e.target.value)} disabled={loading}
                  placeholder="admin@example.com" className="mt-2" autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="password">{l('ລະຫັດຜ່ານ', 'รหัสผ่าน', 'Password')}</Label>
                <Input id="password" type="password" required value={password}
                  onChange={e => setPassword(e.target.value)} disabled={loading}
                  className="mt-2" autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? <span className="animate-spin mr-2">⏳</span> : null}
                {l('ເຂົ້າສູ່ລະບົບ', 'เข้าสู่ระบบ', 'Sign In')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <Button variant="ghost" className="w-full text-sm" onClick={() => navigate('/')}>
                {l('ກັບໄປໜ້າຫຼັກ', 'กลับไปหน้าแรก', 'Back to Home')}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

// Helper: when already logged in, route to /admin if admin, otherwise show message
const AdminGate = () => {
  const { user } = useAuth();
  const { language } = useAppStore();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const l = (lo: string, th: string, en: string) =>
    language === 'en' ? en : language === 'th' ? th : lo;

  useState(() => {
    (async () => {
      const { data } = await supabase.rpc('has_role', { _user_id: user!.id, _role: 'admin' });
      setIsAdmin(!!data);
      setChecking(false);
    })();
    return undefined;
  });

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><span className="animate-pulse text-2xl">⏳</span></div>;
  }
  if (isAdmin) return <Navigate to="/admin" replace />;
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">
            {l('ບັນຊີນີ້ບໍ່ມີສິດ Admin', 'บัญชีนี้ไม่มีสิทธิ์ Admin', 'No admin access')}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {l('ກະລຸນາອອກຈາກລະບົບ ແລະ ເຂົ້າດ້ວຍບັນຊີ Admin', 'กรุณาออกจากระบบและเข้าด้วยบัญชี Admin', 'Please sign out and log in with an admin account')}
          </p>
          <Button onClick={async () => { await supabase.auth.signOut(); navigate('/admin-login'); }} className="w-full">
            {l('ອອກຈາກລະບົບ', 'ออกจากระบบ', 'Sign Out')}
          </Button>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default AdminLoginPage;