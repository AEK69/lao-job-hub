import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Mail, Phone, Eye, EyeOff } from 'lucide-react';

const AuthPage = () => {
  const { language } = useAppStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success(l('ກວດສອບອີເມວ!', 'ตรวจสอบอีเมล!', 'Check your email!'));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(l('ຍິນດີຕ້ອນຮັບ!', 'ยินดีต้อนรับ!', 'Welcome!'));
        navigate('/');
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handlePhoneAuth = async () => {
    setLoading(true);
    try {
      if (!otpSent) {
        if (mode === 'signup') {
          const { error } = await supabase.auth.signUp({ phone, password, options: { data: { display_name: displayName } } });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithOtp({ phone });
          if (error) throw error;
        }
        setOtpSent(true);
        toast.success('OTP sent!');
      } else {
        const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
        if (error) throw error;
        toast.success(l('ຍິນດີຕ້ອນຮັບ!', 'ยินดีต้อนรับ!', 'Welcome!'));
        navigate('/');
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-8 flex-1 max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <div className="text-center mb-6">
              <span className="text-4xl">🔐</span>
              <h1 className="text-2xl font-bold mt-2">{l(mode === 'login' ? 'ເຂົ້າສູ່ລະບົບ' : 'ລົງທະບຽນ', mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก', mode === 'login' ? 'Login' : 'Sign Up')}</h1>
            </div>
            <Tabs value={authMethod} onValueChange={v => { setAuthMethod(v as any); setOtpSent(false); }}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email" className="gap-1"><Mail className="h-4 w-4" /> Email</TabsTrigger>
                <TabsTrigger value="phone" className="gap-1"><Phone className="h-4 w-4" /> Phone</TabsTrigger>
              </TabsList>
              <TabsContent value="email" className="space-y-4">
                {mode === 'signup' && <div><Label>Display Name</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>}
                <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label>
                  <div className="relative"><Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                  </div>
                </div>
                <Button className="w-full" onClick={handleEmailAuth} disabled={loading}>{loading ? '...' : mode === 'login' ? 'Login' : 'Sign Up'}</Button>
              </TabsContent>
              <TabsContent value="phone" className="space-y-4">
                {mode === 'signup' && !otpSent && <div><Label>Display Name</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>}
                <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+856 20..." /></div>
                {mode === 'signup' && !otpSent && <div><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>}
                {otpSent && <div><Label>OTP</Label><Input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} /></div>}
                <Button className="w-full" onClick={handlePhoneAuth} disabled={loading}>{loading ? '...' : otpSent ? 'Verify OTP' : mode === 'login' ? 'Send OTP' : 'Sign Up'}</Button>
              </TabsContent>
            </Tabs>
            <div className="text-center mt-4">
              <Button variant="link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setOtpSent(false); }}>
                {mode === 'login' ? l('ຍັງບໍ່ມີບັນຊີ? ລົງທະບຽນ', 'ยังไม่มีบัญชี? สมัครสมาชิก', "Don't have an account? Sign up") : l('ມີບັນຊີແລ້ວ? ເຂົ້າສູ່ລະບົບ', 'มีบัญชีแล้ว? เข้าสู่ระบบ', 'Already have an account? Login')}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default AuthPage;
