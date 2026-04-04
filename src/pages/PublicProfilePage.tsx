import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';

const PublicProfilePage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <div className="flex-1 flex items-center justify-center">
      <Card className="p-8 text-center"><span className="text-5xl block mb-4">👤</span><p className="text-muted-foreground">Profile not available</p></Card>
    </div>
    <Footer />
  </div>
);

export default PublicProfilePage;
