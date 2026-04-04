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
  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><span className="animate-pulse text-2xl">⏳</span></div>;

  if (!user) return (
    <div className="min-h-screen flex flex-col"><Header /><div className="flex-1 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold">{l('ເຂົ້າສູ່ລະບົບ Admin', 'เข้าสู่ระบบ Admin', 'Admin Access')}</h1>
        <Button onClick={() => navigate('/auth')} className="w-full mt-4">{l('ໄປ Login', 'ไปเข้าสู่ระบบ', 'Go to Login')} <ArrowRight className="ml-2 w-4 h-4" /></Button>
      </Card>
    </div><Footer /></div>
  );

  const handleVerifyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const correctCode = import.meta.env.VITE_ADMIN_CODE || 'admin123';
      if (adminCode !== correctCode) { toast.error(l('ລະຫັດບໍ່ຖືກ', 'รหัสไม่ถูก', 'Invalid code')); setAdminCode(''); return; }
      const { error } = await supabase.from('user_roles').insert({ user_id: user.id, role: 'admin' } as any);
      if (error && error.code !== '23505') throw error;
      toast.success('Welcome Admin!');
      navigate('/admin');
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col"><Header /><div className="flex-1 flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6"><Shield className="w-12 h-12 text-primary mx-auto mb-2" /><Lock className="w-6 h-6 text-primary mx-auto" />
            <h1 className="text-2xl font-bold mt-2">{l('ກວດສອບ Admin', 'ยืนยัน Admin', 'Verify Admin')}</h1>
            <p className="text-xs text-muted-foreground mt-1">{user.email || user.phone}</p>
          </div>
          <form onSubmit={handleVerifyAdmin} className="space-y-4">
            <div><Label>Admin Code</Label><Input type="password" value={adminCode} onChange={e => setAdminCode(e.target.value)} disabled={loading} className="mt-2" /></div>
            <Button type="submit" disabled={!adminCode || loading} className="w-full">{loading ? '...' : l('ອະນຸມັດ', 'ยืนยัน', 'Verify')}</Button>
          </form>
          <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/')}>{l('ກັບໄປບ້ານ', 'กลับหน้าแรก', 'Back Home')}</Button>
        </Card>
      </motion.div>
    </div><Footer /></div>
  );
};

export default AdminLoginPage;
