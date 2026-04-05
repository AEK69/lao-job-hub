import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { districts } from '@/lib/i18n';
import {
  Upload, CheckCircle, Clock, Shield,
  Camera, ShieldCheck, ShieldAlert, ArrowRight, ArrowLeft, User, Phone, MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const KYCPage = () => {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { language } = useAppStore();
  const [step, setStep] = useState(1);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycPreview, setKycPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    display_name: '',
    phone: '',
    date_of_birth: '',
    district: '',
    address: '',
    is_student: false,
    guardian_name: '',
    guardian_phone: '',
  });

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    if (profile) {
      setForm(prev => ({
        ...prev,
        full_name: prev.full_name || profile.full_name || '',
        display_name: prev.display_name || profile.display_name || '',
        phone: prev.phone || profile.phone || '',
        date_of_birth: prev.date_of_birth || profile.date_of_birth || '',
        district: prev.district || profile.district || '',
        address: prev.address || profile.address || '',
        is_student: profile.is_student || false,
        guardian_name: prev.guardian_name || profile.guardian_name || '',
        guardian_phone: prev.guardian_phone || profile.guardian_phone || '',
      }));
    }
  }, [profile]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  // Already approved
  if (profile?.kyc_status === 'approved') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <ShieldCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{l('ຢືນຢັນສຳເລັດແລ້ວ!', 'ยืนยันสำเร็จแล้ว!', 'Verified!')}</h2>
            <p className="text-muted-foreground">{l('ທ່ານສາມາດໃຊ້ງານທຸກລະບົບໄດ້ແລ້ວ', 'คุณสามารถใช้งานได้ทุกฟังก์ชัน', 'You can now use all features')}</p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Pending
  if (profile?.kyc_status === 'pending' && profile?.id_card_url) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <Clock className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold mb-2">{l('ລໍຖ້າການກວດສອບ', 'รอการตรวจสอบ', 'Under Review')}</h2>
            <p className="text-muted-foreground">{l('Admin ຈະກວດສອບຂໍ້ມູນຂອງທ່ານພາຍໃນ 24 ຊົ່ວໂມງ', 'Admin จะตรวจสอบภายใน 24 ชั่วโมง', 'Admin will review within 24 hours')}</p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const isMinor = form.date_of_birth ? (new Date().getFullYear() - new Date(form.date_of_birth).getFullYear()) < 18 : false;

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKycFile(file);
      setKycPreview(URL.createObjectURL(file));
    }
  };

  const canGoNext = () => {
    if (step === 1) return form.full_name && form.display_name && form.phone && form.date_of_birth;
    if (step === 2) return form.district && form.address;
    if (step === 3 && isMinor) return form.guardian_name && form.guardian_phone;
    if (step === 3 && !isMinor) return true;
    if (step === 4) return !!kycFile;
    return false;
  };

  const totalSteps = isMinor ? 4 : 3;
  const docStep = isMinor ? 4 : 3;

  const handleSubmit = async () => {
    if (!kycFile) return;
    setSubmitting(true);
    try {
      const ext = kycFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('id-cards').upload(filePath, kycFile);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('id-cards').getPublicUrl(filePath);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          display_name: form.display_name,
          phone: form.phone,
          date_of_birth: form.date_of_birth,
          district: form.district,
          address: form.address,
          is_student: form.is_student,
          guardian_name: isMinor ? form.guardian_name : null,
          guardian_phone: isMinor ? form.guardian_phone : null,
          id_card_url: urlData.publicUrl,
          kyc_status: 'pending',
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: l('ສົ່ງຂໍ້ມູນສຳເລັດ!', 'ส่งข้อมูลสำเร็จ!', 'Submitted!'),
        text: l('ລໍຖ້າ Admin ກວດສອບ', 'รอ Admin ตรวจสอบ', 'Waiting for admin review'),
        confirmButtonColor: 'hsl(var(--primary))',
      });
      await refreshProfile();
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    // Step 1: Personal Info
    if (step === 1) return (
      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-1"><User className="h-4 w-4" /> {l('ຊື່ເຕັມ', 'ชื่อเต็ม', 'Full Name')} *</Label>
          <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder={l('ຊື່ ແລະ ນາມສະກຸນ', 'ชื่อ-นามสกุล', 'First and Last name')} />
        </div>
        <div>
          <Label>{l('ຊື່ສະແດງ', 'ชื่อที่แสดง', 'Display Name')} *</Label>
          <Input value={form.display_name} onChange={e => update('display_name', e.target.value)} />
        </div>
        <div>
          <Label className="flex items-center gap-1"><Phone className="h-4 w-4" /> {l('ເບີໂທ', 'เบอร์โทร', 'Phone')} *</Label>
          <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="020 XX XXX XXX" />
        </div>
        <div>
          <Label>{l('ວັນເດືອນປີເກີດ', 'วันเดือนปีเกิด', 'Date of Birth')} *</Label>
          <Input type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_student} onCheckedChange={v => update('is_student', v)} />
          <Label>{l('ນັກສຶກສາ', 'นักศึกษา', 'Student')}</Label>
        </div>
      </div>
    );

    // Step 2: Location
    if (step === 2) return (
      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {l('ເມືອງ', 'เมือง', 'District')} *</Label>
          <Select value={form.district} onValueChange={v => update('district', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {districts.map(d => (<SelectItem key={d.id} value={d.id}>{d[language] || d.lo}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{l('ທີ່ຢູ່ລະອຽດ', 'ที่อยู่', 'Address')} *</Label>
          <Input value={form.address} onChange={e => update('address', e.target.value)} />
        </div>
      </div>
    );

    // Step 3: Guardian (for minors) or Document upload
    if (step === 3 && isMinor) return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-2">
          <p className="text-sm text-amber-800">
            {l('ເນື່ອງຈາກທ່ານອາຍຸຕ່ຳກວ່າ 18 ປີ ຕ້ອງມີຜູ້ປົກຄອງຢືນຢັນ', 'เนื่องจากอายุต่ำกว่า 18 ปี ต้องมีผู้ปกครองยืนยัน', 'Since you are under 18, a guardian must verify')}
          </p>
        </div>
        <div>
          <Label>{l('ຊື່ຜູ້ປົກຄອງ', 'ชื่อผู้ปกครอง', 'Guardian Name')} *</Label>
          <Input value={form.guardian_name} onChange={e => update('guardian_name', e.target.value)} />
        </div>
        <div>
          <Label>{l('ເບີໂທຜູ້ປົກຄອງ', 'เบอร์โทรผู้ปกครอง', 'Guardian Phone')} *</Label>
          <Input value={form.guardian_phone} onChange={e => update('guardian_phone', e.target.value)} />
        </div>
      </div>
    );

    // Document upload step
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {form.is_student
            ? l('ອັບໂຫລດບັດນັກສຶກສາ', 'อัปโหลดบัตรนักศึกษา', 'Upload Student ID Card')
            : l('ອັບໂຫລດບັດປະຈຳຕົວ', 'อัปโหลดบัตรประจำตัว', 'Upload National ID Card')}
        </p>
        {kycPreview ? (
          <div className="space-y-3">
            <img src={kycPreview} alt="Preview" className="w-full max-h-60 object-contain rounded-lg border" />
            <Button variant="outline" size="sm" onClick={() => { setKycFile(null); setKycPreview(null); }}>
              {l('ເລືອກໃໝ່', 'เลือกใหม่', 'Choose again')}
            </Button>
          </div>
        ) : (
          <label className="block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition">
            <Camera className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium">{l('ກົດເພື່ອເລືອກຮູບ', 'คลิกเลือกรูป', 'Click to select image')}</p>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </label>
        )}
      </div>
    );
  };

  const currentStepIsDoc = (isMinor && step === 4) || (!isMinor && step === 3);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-8 flex-1 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-6">
            <Shield className="h-12 w-12 mx-auto mb-2 text-primary" />
            <h1 className="text-2xl font-bold">{l('ຢືນຢັນຕົວຕົນ', 'ยืนยันตัวตน', 'Identity Verification')}</h1>
          </div>

          {profile?.kyc_status === 'rejected' && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <p className="text-sm">{l('ການຢືນຢັນຖືກປະຕິເສດ ກະລຸນາສົ່ງໃໝ່', 'การยืนยันถูกปฏิเสธ กรุณาส่งใหม่', 'Verification rejected. Please resubmit.')}</p>
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-1 mb-6">
            {Array.from({ length: isMinor ? 4 : 3 }).map((_, i) => (
              <div key={i} className={`flex-1 h-2 rounded-full transition-colors ${i < step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {l('ຂັ້ນຕອນ', 'ขั้นตอน', 'Step')} {step}/{isMinor ? 4 : 3}
          </p>

          <Card className="p-6">
            {renderStep()}

            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> {l('ກັບຄືນ', 'ย้อนกลับ', 'Back')}
                </Button>
              )}
              <div className="flex-1" />
              {currentStepIsDoc ? (
                <Button onClick={handleSubmit} disabled={!kycFile || submitting} className="gap-1">
                  {submitting ? '...' : l('ສົ່ງຂໍ້ມູນ', 'ส่งข้อมูล', 'Submit')} <CheckCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canGoNext()} className="gap-1">
                  {l('ຕໍ່ໄປ', 'ถัดไป', 'Next')} <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default KYCPage;
