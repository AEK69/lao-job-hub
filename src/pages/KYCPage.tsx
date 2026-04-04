import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';

const KYCPage = () => {
  const { language } = useAppStore();
  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <span className="text-5xl block mb-4">🛡️</span>
          <h2 className="text-xl font-bold mb-2">KYC</h2>
          <p className="text-muted-foreground">{l('ຟີເຈີນີ້ກຳລັງພັດທະນາ', 'ฟีเจอร์นี้กำลังพัฒนา', 'This feature is under development')}</p>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default KYCPage;
