import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
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

  const labels = {
    login: { lo: 'ເຂົ້າສູ່ລະບົບ', th: 'เข้าสู่ระบบ', en: 'Login' },
    signup: { lo: 'ລົງທະບຽນ', th: 'สมัครสมาชิก', en: 'Sign Up' },
    email: { lo: 'ອີເມວ', th: 'อีเมล', en: 'Email' },
    phone: { lo: 'ເບີໂທ', th: 'เบอร์โทร', en: 'Phone' },
    password: { lo: 'ລະຫັດຜ່ານ', th: 'รหัสผ่าน', en: 'Password' },
    name: { lo: 'ຊື່ສະແດງ', th: 'ชื่อที่แสดง', en: 'Display Name' },
    sendOtp: { lo: 'ສົ່ງລະຫັດ OTP', th: 'ส่งรหัส OTP', en: 'Send OTP' },
    verifyOtp: { lo: 'ຢືນຢັນ OTP', th: 'ยืนยัน OTP', en: 'Verify OTP' },
    noAccount: { lo: 'ຍັງບໍ່ມີບັນຊີ?', th: 'ยังไม่มีบัญชี?', en: "Don't have an account?" },
    hasAccount: { lo: 'ມີບັນຊີແລ້ວ?', th: 'มีบัญชีแล้ว?', en: 'Already have an account?' },
  };

  const l = (key: keyof typeof labels) => labels[key][language] || labels[key].lo;

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success(language === 'en' ? 'Check your email to confirm!' : language === 'th' ? 'ตรวจสอบอีเมลเพื่อยืนยัน!' : 'ກວດສອບອີເມວເພື່ອຢືນຢັນ!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(language === 'en' ? 'Welcome back!' : language === 'th' ? 'ยินดีต้อนรับ!' : 'ຍິນດີຕ້ອນຮັບ!');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    setLoading(true);
    try {
      if (!otpSent) {
        if (mode === 'signup') {
          const { error } = await supabase.auth.signUp({
            phone,
            password,
            options: { data: { display_name: displayName } },
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithOtp({ phone });
          if (error) throw error;
        }
        setOtpSent(true);
        toast.success(language === 'en' ? 'OTP sent!' : language === 'th' ? 'ส่ง OTP แล้ว!' : 'ສົ່ງ OTP ແລ້ວ!');
      } else {
        const { error } = await supabase.auth.verifyOtp({
          phone,
          token: otp,
          type: mode === 'signup' ? 'sms' : 'sms',
        });
        if (error) throw error;
        toast.success(language === 'en' ? 'Welcome!' : language === 'th' ? 'ยินดีต้อนรับ!' : 'ຍິນດີຕ້ອນຮັບ!');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-8 flex-1 max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <div className="text-center mb-6">
              <span className="text-4xl">🔐</span>
              <h1 className="text-2xl font-bold mt-2">{l(mode)}</h1>
            </div>

            {/* Auth Method Tabs */}
            <Tabs value={authMethod} onValueChange={(v) => { setAuthMethod(v as 'email' | 'phone'); setOtpSent(false); }}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email" className="gap-1"><Mail className="h-4 w-4" /> {l('email')}</TabsTrigger>
                <TabsTrigger value="phone" className="gap-1"><Phone className="h-4 w-4" /> {l('phone')}</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <Label>{l('name')}</Label>
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="ຊື່ ນາມສະກຸນ" />
                  </div>
                )}
                <div>
                  <Label>{l('email')}</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div>
                  <Label>{l('password')}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button className="w-full" onClick={handleEmailAuth} disabled={loading}>
                  {loading ? '...' : l(mode)}
                </Button>
              </TabsContent>

              <TabsContent value="phone" className="space-y-4">
                {mode === 'signup' && !otpSent && (
                  <div>
                    <Label>{l('name')}</Label>
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="ຊື່ ນາມສະກຸນ" />
                  </div>
                )}
                <div>
                  <Label>{l('phone')}</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+856 20 XX XXX XXX" />
                </div>
                {mode === 'signup' && !otpSent && (
                  <div>
                    <Label>{l('password')}</Label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                )}
                {otpSent && (
                  <div>
                    <Label>OTP</Label>
                    <Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" maxLength={6} />
                  </div>
                )}
                <Button className="w-full" onClick={handlePhoneAuth} disabled={loading}>
                  {loading ? '...' : otpSent ? l('verifyOtp') : (mode === 'signup' ? l('signup') : l('sendOtp'))}
                </Button>
              </TabsContent>
            </Tabs>

            <div className="text-center mt-4 text-sm text-muted-foreground">
              {mode === 'login' ? l('noAccount') : l('hasAccount')}{' '}
              <button
                className="text-primary hover:underline font-medium"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setOtpSent(false); }}
              >
                {mode === 'login' ? l('signup') : l('login')}
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default AuthPage;
