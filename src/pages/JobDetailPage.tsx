import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore, Job } from '@/lib/store';
import { t, districts } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Phone, Clock, Flame, ArrowLeft, MessageCircle, Star } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function formatSalary(salary: string): string {
  return Number(salary).toLocaleString();
}

const JobDetailPage = () => {
  const { id } = useParams();
  const { language } = useAppStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
      setJob(data as Job | null);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center"><span className="text-2xl animate-pulse">⏳</span></div>
      <Footer />
    </div>
  );

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="text-5xl block mb-4">😕</span>
            <p className="text-muted-foreground mb-4">
              {language === 'en' ? 'Job not found' : language === 'th' ? 'ไม่พบงาน' : 'ບໍ່ພົບວຽກ'}
            </p>
            <Link to="/jobs"><Button>← {t('nav.findJobs', language)}</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const district = districts.find(d => d.id === job.district);
  const lat = job.lat || 17.9757;
  const lng = job.lng || 102.6331;

  const handleChat = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/chat?job=${job.id}&to=${job.user_id}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> {t('nav.findJobs', language)}
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <div className="flex items-start gap-3 flex-wrap mb-4">
              {job.is_featured && (
                <Badge className="gap-1 bg-accent text-accent-foreground">
                  <Star className="h-3 w-3" /> {language === 'en' ? 'Featured' : language === 'th' ? 'แนะนำ' : 'ແນະນຳ'}
                </Badge>
              )}
              {job.is_urgent && (
                <Badge variant="destructive" className="gap-1">
                  <Flame className="h-3 w-3" /> {t('job.urgent', language)}
                </Badge>
              )}
              <Badge variant={job.post_type === 'hiring' ? 'default' : 'secondary'}>
                {t(job.post_type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
              </Badge>
            </div>

            <h1 className="text-2xl font-bold mb-2">{job.title}</h1>
            <p className="text-muted-foreground mb-1">{t('job.postedBy', language)}: {job.poster_name}</p>

            <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(job.created_at).toLocaleDateString(language === 'th' ? 'th-TH' : language === 'en' ? 'en-US' : 'lo-LA')}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {district?.[language] || district?.lo}
              </span>
            </div>

            <div className="bg-primary/5 rounded-xl p-4 mb-6">
              <div className="text-sm text-muted-foreground">{t('job.salary', language)}</div>
              <div className="text-2xl font-bold text-primary">
                💰 {formatSalary(job.salary)} {t(job.salary_type === 'day' ? 'job.perDay' : 'job.perMonth', language)}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">{t('post.description', language)}</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            </div>

            {(job.work_date || job.work_time) && (
              <div className="bg-accent/10 rounded-xl p-4 mb-6 flex items-center gap-3">
                <Clock className="h-5 w-5 text-accent" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'en' ? 'Work Schedule' : language === 'th' ? 'กำหนดการ' : 'ກຳນົດເວລາ'}
                  </div>
                  <div className="font-medium">
                    {job.work_date && new Date(job.work_date).toLocaleDateString(language === 'th' ? 'th-TH' : language === 'en' ? 'en-US' : 'lo-LA')}
                    {job.work_date && job.work_time && ' • '}
                    {job.work_time && job.work_time.slice(0, 5)}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{job.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href={`tel:${job.phone}`} className="text-primary hover:underline">{job.phone}</a>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border h-[300px] mb-4">
              <MapContainer center={[lat, lng]} zoom={14} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]}>
                  <Popup>{job.title} - {job.address}</Popup>
                </Marker>
              </MapContainer>
            </div>

            <div className="flex gap-3">
              <Button size="lg" className="flex-1 gap-2" asChild>
                <a href={`tel:${job.phone}`}>
                  <Phone className="h-4 w-4" /> {t('job.contact', language)}
                </a>
              </Button>
              {user && user.id !== job.user_id && (
                <Button size="lg" variant="outline" className="flex-1 gap-2" onClick={handleChat}>
                  <MessageCircle className="h-4 w-4" />
                  {language === 'en' ? 'Chat' : language === 'th' ? 'แชท' : 'ແຊັດ'}
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

export default JobDetailPage;
