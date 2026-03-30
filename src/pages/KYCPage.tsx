import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, CheckCircle, AlertCircle, Clock, Shield, 
  FileText, Camera, Smartphone, Lock, ChevronRight,
  ShieldCheck, ShieldAlert, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const KYCPage = () => {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { language } = useAppStore();
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycPreview, setKycPreview] = useState<string | null>(null);
  const [kycUploading, setKycUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const steps = [
    {
      number: 1,
      title: l('ກວດສອບສິ່ງທີ່ຕ້ອງການ', 'ตรวจสอบความต้องการ', 'Check Requirements'),
      description: l('ວ່າທ່ານມີເອກະສານທີ່ຈໍາເປັນຫຼືບໍ່', 'ตรวจสอบว่าคุณมีเอกสารที่จำเป็น', 'Verify you have required documents'),
      icon: FileText,
    },
    {
      number: 2,
      title: l('ອັບໂຫລດເອກະສານ', 'อัปโหลดเอกสาร', 'Upload Document'),
      description: l('ອັບໂຫລດຮູບຖ່າຍຂອງເອກະສານປະຈໍາຕົວ', 'อัปโหลดรูปถ่ายเอกสารประจำตัว', 'Upload your ID document photo'),
      icon: Camera,
    },
    {
      number: 3,
      title: l('ລໍຖ້າການກວດສອບ', 'รอการตรวจสอบ', 'Wait for Review'),
      description: l('Admin ກຳລັງກວດສອບເອກະສານຂອງທ່ານ', 'Admin จะตรวจสอบเอกสารของคุณ', 'Our team reviews your submission'),
      icon: Clock,
    },
    {
      number: 4,
      title: l('ສໍາເລັດ!', 'สำเร็จ!', 'All Set!'),
      description: l('ທ່ານສາມາດໃຊ້ທຸກລາຍການໄດ້ແລ້ວ', 'คุณสามารถใช้งานได้แล้ว', 'You can use all features'),
      icon: ShieldCheck,
    },
  ];

  const requirements = [
    {
      icon: FileText,
      title: l('ເອກະສານທີ່ຍອມຮັບ', 'เอกสารที่ยอมรับ', 'Valid Documents'),
      items: [
        l('ID Card / ບັດປະຈໍາຕົວ', 'บัตรประจำตัว', 'National ID Card'),
        l('Passport / ລາຍຠ່າວ', 'พาสปอร์ต', 'Passport'),
        l('ໃບຫລັກນ້ອຍ / ໃບຜ່ານແດນ', 'ใบขับขี่', 'Driver License'),
      ],
    },
    {
      icon: Camera,
      title: l('ຄຸນលັກສະນະຮູບ', 'คุณลักษณะรูป', 'Photo Requirements'),
      items: [
        l('ຮູບຊัດເຈນ ໃນແສງສະຫວ່າງ', 'ภาพชัดเจน ในแสงสว่าง', 'Clear, well-lit photo'),
        l('ເນື້ອທີ່ຜະສົ່ວນໃຫຍ່ລະ 80%', 'ขนาด A4 อย่างน้อย', 'At least A4 size'),
        l('ຮູບ JPG, PNG ຫຼື PDF', 'JPG, PNG หรือ PDF', 'JPG, PNG or PDF format'),
      ],
    },
    {
      icon: Lock,
      title: l('ຄວາມປອດໄພ', 'ความปลอดภัย', 'Security'),
      items: [
        l('ຂໍ້ມູນຖືກເຂົ້າລະຫັດ', 'ข้อมูลได้รับการเข้ารหัส', 'Data is encrypted'),
        l('ສະກັດສຽງ 256-bit SSL', 'ใช้ 256-bit SSL', 'Uses 256-bit SSL'),
        l('ບໍ່ແບ່ງປັນກັບຝ່າຍທີ 3', 'ไม่แชร์ข้อมูลกับบุคคลที่ 3', 'Never shared with third parties'),
      ],
    },
  ];

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  const handleKycFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKycFile(file);
      setKycPreview(URL.createObjectURL(file));
      setCurrentStep(1);
    }
  };

  const handleKycUpload = async () => {
    if (!kycFile) {
      toast.error(l('ເລືອກໄຟລ໌ຮູບພາບກ່ອນ', 'เลือกรูปถ่ายก่อน', 'Please select an image first'));
      return;
    }

    setKycUploading(true);
    try {
      const ext = kycFile.name.split('.').pop();
      const filePath = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('id-cards').upload(filePath, kycFile);
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('id-cards').getPublicUrl(filePath);
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ id_card_url: data.publicUrl, kyc_status: 'pending' })
        .eq('user_id', user!.id);

      if (updateErr) throw updateErr;

      toast.success(
        l(
          'ອັບໂຫລດແລ້ວ! ລໍຖ້າ Admin ຢືນຢັນ',
          'อัปโหลดแล้ว! รอการยืนยันของ Admin',
          'Uploaded! Waiting for admin verification'
        )
      );
      setKycFile(null);
      setKycPreview(null);
      setCurrentStep(2);
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || l('ເກີດຂໍ້ຜິດພາດ', 'เกิดข้อผิดพลาด', 'Error occurred'));
    } finally {
      setKycUploading(false);
    }
  };

  // Get current step based on status
  const getProgressStep = () => {
    if (profile?.kyc_status === 'approved') return 3;
    if (profile?.kyc_status === 'pending') return 2;
    if (profile?.kyc_status === 'rejected') return 1;
    return 0;
  };

  const progressStep = getProgressStep();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      <div className="container py-12 flex-1 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold mb-3">
              {l('ກວດສອບຕົວຕົນຂອງທ່ານ', 'ยืนยันตัวตนของคุณ', 'Verify Your Identity')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {l(
                'ກວດສອບຕົວຕົນຂອງທ່ານເພື່ອໃຫ້ສາມາດຂອບໃຊ້ລາຍການທັງໝົດໄດ້',
                'ยืนยันตัวตนของคุณเพื่อใช้งานทุกลาຍการได้',
                'Verify your identity to unlock all features'
              )}
            </p>
          </div>

          {/* Status Display */}
          {profile?.kyc_status === 'approved' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="bg-green-100 rounded-full p-3">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-900">
                    {l('ຢືນຢັນສໍາເລັດ!', 'ยืนยันสำเร็จแล้ว!', 'Verification Complete!')}
                  </h3>
                  <p className="text-green-800 text-sm">
                    {l('ທ່ານໄດ້ຮັບການອະນຸມັດ ແລະສາມາດໃຊ້ທຸກລາຍການໄດ້', 'คุณได้รับอนุมัติแล้ว', 'You can now use all features')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {profile?.kyc_status === 'rejected' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 p-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="bg-red-100 rounded-full p-3">
                  <ShieldAlert className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">
                    {l('ສະ​ໂມສະຕໍ່ໍ', 'ปฏิเสธแล้ว', 'Verification Rejected')}
                  </h3>
                  <p className="text-red-800 text-sm">
                    {l('ເອກະສານຂອງທ່ານບໍ່ຈົບຕາม ກະລຸນາອັບໂຫລດໃໝ່', 'เอกสารไม่ตรงตามเงื่อนไข', 'Document did not meet requirements')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step Indicator */}
          <div className="mb-12">
            <div className="flex justify-between items-center">
              {steps.map((step, idx) => {
                const isActive = idx === progressStep;
                const isComplete = idx < progressStep;
                const StepIcon = step.icon;

                return (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex flex-col items-center flex-1"
                  >
                    <div className="flex items-center w-full">
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          isComplete
                            ? 'bg-green-500 text-white'
                            : isActive
                            ? 'bg-blue-500 text-white ring-4 ring-blue-200'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isComplete ? <CheckCircle className="h-6 w-6" /> : <StepIcon className="h-5 w-5" />}
                      </div>
                      {idx < steps.length - 1 && (
                        <div
                          className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                            isComplete ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                    <div className="text-center mt-3 w-full">
                      <p className="font-semibold text-sm">{step.number}. {step.title}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Requirements Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              {l('ຄວາມສາມາດໃນການໃຫ້', 'ข้อกำหนด', 'Requirements')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {requirements.map((req, idx) => {
                const Icon = req.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-100 rounded-lg p-3">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="font-semibold">{req.title}</h3>
                      </div>
                      <ul className="space-y-3">
                        {req.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Upload Section */}
          {profile?.kyc_status !== 'approved' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Upload className="h-6 w-6" />
                  {l('ອັບໂຫລດເອກະສານ', 'อัปโหลดเอกสาร', 'Upload Your Document')}
                </h2>
                <p className="text-muted-foreground mb-8">
                  {profile?.kyc_status === 'pending'
                    ? l('ເອກະສານຂອງທ່ານກຳລັງລໍຖ້າການກວດສອບ', 'เอกสารของคุณรอการตรวจสอบ', 'Your document is being reviewed')
                    : l('ອັບໂຫລດຮູບຖ່າຍເອກະສານປະຈໍາຕົວຂອງທ່ານ', 'อัปโหลดรูปถ่ายเอกสารประจำตัวของคุณ', 'Upload a photo of your ID document')}
                </p>

                {kycPreview ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
                      <img src={kycPreview} alt="Preview" className="w-full max-h-80 object-contain rounded" />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        size="lg"
                        className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                        onClick={handleKycUpload}
                        disabled={kycUploading}
                      >
                        <Upload className="h-4 w-4" />
                        {kycUploading ? l('ກຳລັງອັບໂຫລດ...', 'กำลังอัปโหลด...', 'Uploading...') : l('ຢືນຢັນອັບໂຫລດ', 'ยืนยันอัปโหลด', 'Submit Document')}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => {
                          setKycPreview(null);
                          setKycFile(null);
                          setCurrentStep(0);
                        }}
                        disabled={kycUploading}
                      >
                        {l('ເລືອກຄືນໃໝ່', 'เลือกใหม่', 'Choose Again')}
                      </Button>
                    </div>
                  </motion.div>
                ) : profile?.kyc_status === 'pending' ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="font-semibold text-blue-900">
                            {l('ລໍຖ້າການກວດສອບ', 'รอการตรวจสอบ', 'Under Review')}
                          </p>
                          <p className="text-sm text-blue-800">
                            {l('Admin ກະ​ລຸ​ນາກວດສອບຂໍ້ມູນໃນ 24 ຊົ່ວໂມງ', 'Admin จะตรวจสอบภายใน 24 ชั่วโมง', 'We usually respond within 24 hours')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50 transition">
                    <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center">
                      <div className="bg-blue-100 rounded-full p-4 mb-4">
                        <Upload className="h-8 w-8 text-blue-600" />
                      </div>
                      <p className="font-semibold text-lg mb-1">
                        {l('ຄລິກເພື່ອເລືອກຮູບ', 'คลิกเลือกรูป', 'Click to select image')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {l('ຫຼື ລາກວາງເອກະສານ', 'หรือลากวางเอกสาร', 'or drag and drop your file')}
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        className="hidden"
                        onChange={handleKycFileSelect}
                      />
                    </motion.div>
                  </label>
                )}
              </Card>
            </motion.div>
          )}

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              {l('ຄວາມປອດໄພຂອງເອກະສານ', 'ความอ่านไม่ได้ของเอกสาร', 'Your Data is Safe')}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {l('ຮູບຖ່າຍຖຸກເກັບໄວ້ເປັນສ່ວນຕົວ', 'ข้อมูลได้รับการเข้ารหัส', 'All data is encrypted with 256-bit SSL')}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {l('ບໍ່ແບ່ງປັນກັບບຸಕ్ಕಲທີ 3', 'ไม่แสญแลกกับบริษัทอื่น', 'Never shared with third parties')}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {l('ເປັນໄປຕາມກົດໝາຍ GDPR', 'ถูกต้องตามกฎ GDPR', 'Compliant with GDPR regulations')}
              </li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default KYCPage;
