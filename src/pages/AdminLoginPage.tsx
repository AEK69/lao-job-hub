import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Shield, ArrowRight, Lock } from 'lucide-react';

const AdminLoginPage = () => {
  const { language } = useAppStore();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  const l = (lo: string, th: string, en: string) =>
    language === 'en' ? en : language === 'th' ? th : lo;

  // ── 1. Still resolving auth ──────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="animate-pulse text-2xl">⏳</span>
      </div>
    );
  }

  // ── 2. Not logged in → send to /auth ────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="w-full max-w-md p-8">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <Shield className="w-12 h-12 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">
                  {l('ເຂົ້າສູ່ລະບົບ Admin', 'เข้าสู่ระบบ Admin', 'Admin Access')}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {l('ກະລຸນາ login ກ່ອນ', 'โปรดเข้าสู่ระบบก่อน', 'Please log in first')}
                </p>
              </div>

              <Button
                onClick={() => navigate('/auth')}
                className="w-full"
                size="lg"
              >
                {l('ໄປຫາ Login', 'ไปที่หน้าเข้าสู่ระบบ', 'Go to Login')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                {l(
                  'ຫຼັງຈາກ login, ກະລຸນາກັບມາຫາໜ້ານີ້',
                  'หลังจากเข้าสู่ระบบ โปรดกลับมาที่หน้านี้',
                  'After logging in, return to this page',
                )}
              </p>
            </Card>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── 3. Logged in → verify admin code ────────────────────────────────────
  const handleVerifyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const correctCode = import.meta.env.VITE_ADMIN_CODE || 'admin123';

      if (adminCode !== correctCode) {
        toast.error(
          l('ລະຫັດ Admin ບໍ່ຖືກຕ້ອງ', 'รหัส Admin ไม่ถูกต้อง', 'Invalid admin code'),
        );
        setAdminCode('');
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'admin' })
        .single();

      // 23505 = unique-violation (already admin) — that's fine
      if (error && error.code !== '23505') throw error;

      toast.success(l('ຍິນດີຕ້ອນຮັບ Admin!', 'ยินดีต้อนรับสู่ Admin!', 'Welcome to Admin!'));
      navigate('/admin');
    } catch (err: any) {
      console.error('Admin auth error:', err);
      toast.error(
        err.message || l('ເກີດຂໍ້ຜິດພາດ', 'เกิดข้อผิดพลาด', 'An error occurred'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full max-w-md p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="relative w-16 h-16">
                  <Shield className="w-12 h-12 text-primary" />
                  <Lock className="w-6 h-6 text-primary absolute bottom-0 right-0" />
                </div>
              </div>
              <h1 className="text-2xl font-bold">
                {l('ກວດສອບ Admin', 'ยืนยันการเข้าใช้งาน Admin', 'Verify Admin Access')}
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                {l(
                  'ກະລຸນາໃສ່ລະຫັດ Admin ເພື່ອອະນຸມັດ',
                  'กรุณาป้อนรหัส Admin เพื่อยืนยัน',
                  'Enter the admin code to proceed',
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {l('ລົງນາມເຂົ້າ: ', 'เข้าสู่ระบบเป็น: ', 'Logged in as: ')}
                <span className="font-semibold text-foreground">
                  {user.email || user.phone}
                </span>
              </p>
            </div>

            <form onSubmit={handleVerifyAdmin}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="adminCode">
                    {l('ລະຫັດ Admin', 'รหัส Admin', 'Admin Code')}
                  </Label>
                  <Input
                    id="adminCode"
                    type="password"
                    placeholder={l('ໃສ່ລະຫັດ...', 'ป้อนรหัส...', 'Enter code...')}
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    disabled={loading}
                    className="mt-2"
                    autoComplete="current-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!adminCode || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      {l('ກຳລັງກວດສອບ...', 'กำลังตรวจสอบ...', 'Verifying...')}
                    </>
                  ) : (
                    <>
                      {l('ອະນຸມັດ', 'ยืนยัน', 'Verify')}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t">
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => navigate('/')}
              >
                {l('ກັບໄປບ້ານ', 'กลับไปที่หน้าแรก', 'Back to Home')}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminLoginPage;