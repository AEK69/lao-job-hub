import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { districts } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Mail, Phone, Eye, EyeOff, Upload, ShieldCheck } from 'lucide-react';

const AuthPage = () => {
  const { language } = useAppStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'auth' | 'kyc'>('auth');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // KYC fields
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [kycPhone, setKycPhone] = useState('');
  const [kycAddress, setKycAddress] = useState('');
  const [kycDistrict, setKycDistrict] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const isUnder18 = dateOfBirth ? calculateAge(dateOfBirth) < 18 : false;

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.user) {
          toast.success(l('ກວດສອບອີເມວເພື່ອຢືນຢັນ!', 'ตรวจสอบอีเมลเพื่อยืนยัน!', 'Check your email to confirm!'));
          setStep('kyc');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(l('ຍິນດີຕ້ອນຮັບ!', 'ยินดีต้อนรับ!', 'Welcome back!'));
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      toast.success(l('ຍິນດີຕ້ອນຮັບ!', 'ยินดีต้อนรับ!', 'Welcome!'));
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed');
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
        toast.success(l('ສົ່ງ OTP ແລ້ວ!', 'ส่ง OTP แล้ว!', 'OTP sent!'));
      } else {
        const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
        if (error) throw error;
        if (mode === 'signup') {
          setStep('kyc');
        } else {
          toast.success(l('ຍິນດີຕ້ອນຮັບ!', 'ยินดีต้อนรับ!', 'Welcome!'));
          navigate('/');
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKycSubmit = async () => {
    if (!fullName || !dateOfBirth || !kycPhone || !kycDistrict) {
      toast.error(l('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ', 'กรุณากรอกข้อมูลให้ครบ', 'Please fill all required fields'));
      return;
    }
    if (isUnder18 && (!guardianName || !guardianPhone)) {
      toast.error(l('ກະລຸນາໃສ່ຂໍ້ມູນຜູ້ປົກຄອງ', 'กรุณาใส่ข้อมูลผู้ปกครอง', 'Guardian info required for under 18'));
      return;
    }
    if (!idCardFile) {
      toast.error(l('ກະລຸນາອັບໂຫລດບັດປະຈຳຕົວ', 'กรุณาอัปโหลดบัตรประจำตัว', 'Please upload ID card'));
      return;
    }

    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not logged in');

      // Upload ID card
      const ext = idCardFile.name.split('.').pop();
      const filePath = `${currentUser.id}/id-card.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('id-cards')
        .upload(filePath, idCardFile, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('id-cards').getPublicUrl(filePath);

      // Update profile with KYC data
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          display_name: displayName || fullName,
          date_of_birth: dateOfBirth,
          phone: kycPhone,
          address: kycAddress,
          district: kycDistrict,
          is_student: isStudent,
          guardian_name: isUnder18 ? guardianName : null,
          guardian_phone: isUnder18 ? guardianPhone : null,
          id_card_url: filePath,
          kyc_status: 'pending',
        } as any)
        .eq('user_id', currentUser.id);
      if (error) throw error;

      toast.success(l('ສົ່ງຂໍ້ມູນແລ້ວ! ລໍຖ້າ Admin ຢືນຢັນ', 'ส่งข้อมูลแล้ว! รอ Admin ยืนยัน', 'Submitted! Waiting for admin approval'));
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'kyc') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="container py-8 flex-1 max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6">
              <div className="text-center mb-6">
                <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
                <h1 className="text-xl font-bold mt-2">{l('ຢືນຢັນຕົວຕົນ (KYC)', 'ยืนยันตัวตน (KYC)', 'Identity Verification (KYC)')}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {l('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບເພື່ອໃຫ້ Admin ຢືນຢັນບັນຊີ', 'กรุณากรอกข้อมูลเพื่อให้ Admin ยืนยันบัญชี', 'Fill in your details for admin verification')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>{l('ຊື່ ແລະ ນາມສະກຸນ', 'ชื่อและนามสกุล', 'Full Name')} *</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>

                <div>
                  <Label>{l('ວັນເດືອນປີເກີດ', 'วันเดือนปีเกิด', 'Date of Birth')} *</Label>
                  <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                  {isUnder18 && (
                    <p className="text-xs text-orange-500 mt-1">
                      ⚠️ {l('ອາຍຸຕ່ຳກວ່າ 18 ປີ ຕ້ອງມີຜູ້ປົກຄອງຢືນຢັນ', 'อายุต่ำกว่า 18 ปี ต้องมีผู้ปกครองยืนยัน', 'Under 18 - guardian verification required')}
                    </p>
                  )}
                </div>

                <div>
                  <Label>{l('ເບີໂທ', 'เบอร์โทร', 'Phone')} *</Label>
                  <Input value={kycPhone} onChange={e => setKycPhone(e.target.value)} placeholder="020 XX XXX XXX" />
                </div>

                <div>
                  <Label>{l('ເມືອງ', 'เมือง', 'District')} *</Label>
                  <Select value={kycDistrict} onValueChange={setKycDistrict}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d[language] || d.lo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{l('ທີ່ຢູ່', 'ที่อยู่', 'Address')}</Label>
                  <Input value={kycAddress} onChange={e => setKycAddress(e.target.value)} />
                </div>

                <div className="flex items-center gap-3">
                  <Switch checked={isStudent} onCheckedChange={setIsStudent} />
                  <Label>{l('ເປັນນັກສຶກສາ', 'เป็นนักศึกษา', 'I am a student')}</Label>
                </div>

                {isUnder18 && (
                  <div className="border rounded-lg p-4 space-y-3 bg-orange-50 dark:bg-orange-950/20">
                    <h3 className="font-semibold text-sm">{l('ຂໍ້ມູນຜູ້ປົກຄອງ', 'ข้อมูลผู้ปกครอง', 'Guardian Information')}</h3>
                    <div>
                      <Label>{l('ຊື່ຜູ້ປົກຄອງ', 'ชื่อผู้ปกครอง', 'Guardian Name')} *</Label>
                      <Input value={guardianName} onChange={e => setGuardianName(e.target.value)} />
                    </div>
                    <div>
                      <Label>{l('ເບີໂທຜູ້ປົກຄອງ', 'เบอร์โทรผู้ปกครอง', 'Guardian Phone')} *</Label>
                      <Input value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} />
                    </div>
                  </div>
                )}

                <div>
                  <Label>
                    {isStudent
                      ? l('ອັບໂຫລດບັດນັກສຶກສາ', 'อัปโหลดบัตรนักศึกษา', 'Upload Student ID')
                      : l('ອັບໂຫລດບັດປະຈຳຕົວ', 'อัปโหลดบัตรประจำตัว', 'Upload ID Card')} *
                  </Label>
                  <div className="mt-1">
                    <label className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {idCardFile ? idCardFile.name : l('ເລືອກໄຟລ໌...', 'เลือกไฟล์...', 'Choose file...')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => setIdCardFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {idCardFile && (
                      <img
                        src={URL.createObjectURL(idCardFile)}
                        alt="ID Preview"
                        className="mt-2 rounded-lg max-h-40 object-cover"
                      />
                    )}
                  </div>
                </div>

                <Button className="w-full" onClick={handleKycSubmit} disabled={loading}>
                  {loading ? '...' : l('ສົ່ງຂໍ້ມູນຢືນຢັນ', 'ส่งข้อมูลยืนยัน', 'Submit Verification')}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

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

            <Tabs value={authMethod} onValueChange={(v) => { setAuthMethod(v as 'email' | 'phone'); setOtpSent(false); }}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email" className="gap-1"><Mail className="h-4 w-4" /> {l('ອີເມວ', 'อีเมล', 'Email')}</TabsTrigger>
                <TabsTrigger value="phone" className="gap-1"><Phone className="h-4 w-4" /> {l('ເບີໂທ', 'เบอร์โทร', 'Phone')}</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <Label>{l('ຊື່ສະແດງ', 'ชื่อที่แสดง', 'Display Name')}</Label>
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="ຊື່ ນາມສະກຸນ" />
                  </div>
                )}
                <div>
                  <Label>{l('ອີເມວ', 'อีเมล', 'Email')}</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div>
                  <Label>{l('ລະຫັດຜ່ານ', 'รหัสผ่าน', 'Password')}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button className="w-full" onClick={handleEmailAuth} disabled={loading}>
                  {loading ? '...' : l(mode === 'login' ? 'ເຂົ້າສູ່ລະບົບ' : 'ລົງທະບຽນ', mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก', mode === 'login' ? 'Login' : 'Sign Up')}
                </Button>
              </TabsContent>

              <TabsContent value="phone" className="space-y-4">
                {mode === 'signup' && !otpSent && (
                  <div>
                    <Label>{l('ຊື່ສະແດງ', 'ชื่อที่แสดง', 'Display Name')}</Label>
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="ຊື່ ນາມສະກຸນ" />
                  </div>
                )}
                <div>
                  <Label>{l('ເບີໂທ', 'เบอร์โทร', 'Phone')}</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+856 20 XX XXX XXX" />
                </div>
                {mode === 'signup' && !otpSent && (
                  <div>
                    <Label>{l('ລະຫັດຜ່ານ', 'รหัสผ่าน', 'Password')}</Label>
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
                  {loading ? '...' : otpSent ? l('ຢືນຢັນ OTP', 'ยืนยัน OTP', 'Verify OTP') : l(mode === 'signup' ? 'ລົງທະບຽນ' : 'ສົ່ງລະຫັດ OTP', mode === 'signup' ? 'สมัครสมาชิก' : 'ส่งรหัส OTP', mode === 'signup' ? 'Sign Up' : 'Send OTP')}
                </Button>
              </TabsContent>
            </Tabs>

            <div className="text-center mt-4 text-sm text-muted-foreground">
              {mode === 'login' ? l('ຍັງບໍ່ມີບັນຊີ?', 'ยังไม่มีบัญชี?', "Don't have an account?") : l('ມີບັນຊີແລ້ວ?', 'มีบัญชีแล้ว?', 'Already have an account?')}{' '}
              <button className="text-primary hover:underline font-medium" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setOtpSent(false); }}>
                {mode === 'login' ? l('ລົງທະບຽນ', 'สมัครสมาชิก', 'Sign Up') : l('ເຂົ້າສູ່ລະບົບ', 'เข้าสู่ระบบ', 'Login')}
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
