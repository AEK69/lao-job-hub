import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore, Job } from '@/lib/store';
import { t, districts } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Phone, Clock, Flame, ArrowLeft, MessageCircle, Star, CheckCircle, HandCoins } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { JobDetailSkeleton } from '@/components/LoadingSkeleton';
import { formatSalary } from '@/lib/constants';
import { ReviewDialog } from '@/components/ReviewDialog';
import Swal from 'sweetalert2';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const JobDetailPage = () => {
  const { id } = useParams();
  const { language } = useAppStore();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [posterRating, setPosterRating] = useState<{ avg: number; count: number } | null>(null);
  const [acceptorName, setAcceptorName] = useState<string | null>(null);

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
      setJob(data as Job | null);
      setLoading(false);

      if (data) {
        const { data: reviews } = await supabase.from('reviews').select('rating').eq('reviewed_id', data.user_id);
        if (reviews && reviews.length > 0) {
          const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
          setPosterRating({ avg: Math.round(avg * 10) / 10, count: reviews.length });
        }
        // Load acceptor name
        if ((data as any).accepted_by) {
          const { data: p } = await supabase.from('profiles').select('display_name').eq('user_id', (data as any).accepted_by).single();
          if (p) setAcceptorName(p.display_name);
        }
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col"><Header /><div className="container py-6 flex-1"><JobDetailSkeleton /></div><Footer /></div>
  );

  if (!job) return (
    <div className="min-h-screen flex flex-col"><Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center"><span className="text-5xl block mb-4">😕</span>
          <p className="text-muted-foreground mb-4">{l('ບໍ່ພົບວຽກ', 'ไม่พบงาน', 'Job not found')}</p>
          <Link to="/jobs"><Button>← {t('nav.findJobs', language)}</Button></Link>
        </div>
      </div><Footer /></div>
  );

  const district = districts.find(d => d.id === job.district);

  const parseGoogleMapCoords = (address: string): [number, number] | null => {
    const atMatch = address.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) return [parseFloat(atMatch[1]), parseFloat(atMatch[2])];
    const qMatch = address.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) return [parseFloat(qMatch[1]), parseFloat(qMatch[2])];
    const placeMatch = address.match(/place\/[^/]*\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) return [parseFloat(placeMatch[1]), parseFloat(placeMatch[2])];
    return null;
  };

  const parsedCoords = parseGoogleMapCoords(job.address);
  const lat = job.lat || parsedCoords?.[0] || 17.9757;
  const lng = job.lng || parsedCoords?.[1] || 102.6331;
  const isGoogleMapLink = job.address.includes('google.com/maps') || job.address.includes('maps.app.goo.gl') || job.address.includes('goo.gl/maps');

  const handleChat = () => {
    if (!user) { navigate('/auth'); return; }
    if (profile?.kyc_status !== 'approved') {
      Swal.fire({ icon: 'warning', title: l('ຕ້ອງຢືນຢັນຕົວຕົນກ່ອນ', 'ต้องยืนยันตัวตนก่อน', 'KYC Required'), text: l('ກະລຸນາຢືນຢັນ KYC ກ່ອນແຊັດ', 'กรุณายืนยัน KYC ก่อนแชท', 'Please complete KYC before chatting'), confirmButtonText: l('ໄປຢືນຢັນ', 'ไปยืนยัน', 'Go Verify') }).then(r => { if (r.isConfirmed) navigate('/kyc'); });
      return;
    }
    navigate(`/chat?job=${job.id}&to=${job.user_id}`);
  };

  // Accept job (worker applies)
  const handleAcceptJob = async () => {
    if (!user) { navigate('/auth'); return; }
    if (profile?.kyc_status !== 'approved') {
      Swal.fire({ icon: 'warning', title: l('ຕ້ອງຢືນຢັນຕົວຕົນກ່ອນ', 'ต้องยืนยันตัวตนก่อน', 'KYC Required'), text: l('ກະລຸນາຢືນຢັນ KYC ກ່ອນຮັບງານ', 'กรุณายืนยัน KYC ก่อนรับงาน', 'Please complete KYC before accepting'), confirmButtonText: l('ໄປຢືນຢັນ', 'ไปยืนยัน', 'Go Verify') }).then(r => { if (r.isConfirmed) navigate('/kyc'); });
      return;
    }
    const result = await Swal.fire({
      icon: 'question',
      title: l('ຢືນຢັນຮັບງານ?', 'ยืนยันรับงาน?', 'Accept this job?'),
      text: l(`ຄ່າຕອບແທນ: ${formatSalary(job.salary)} ₭`, `ค่าตอบแทน: ${formatSalary(job.salary)} ₭`, `Compensation: ${formatSalary(job.salary)} ₭`),
      showCancelButton: true,
      confirmButtonText: l('ຮັບງານ', 'รับงาน', 'Accept'),
      cancelButtonText: l('ຍົກເລີກ', 'ยกเลิก', 'Cancel'),
      confirmButtonColor: 'hsl(142, 76%, 36%)',
    });
    if (!result.isConfirmed) return;

    const { error } = await supabase.from('jobs').update({
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
      status: 'accepted',
    } as any).eq('id', job.id).eq('status', 'active');

    if (error) { Swal.fire({ icon: 'error', text: error.message }); return; }
    Swal.fire({ icon: 'success', title: l('ຮັບງານສຳເລັດ!', 'รับงานสำเร็จ!', 'Job Accepted!'), timer: 2000, showConfirmButton: false });
    setJob({ ...job, accepted_by: user.id, accepted_at: new Date().toISOString(), status: 'accepted' });
    setAcceptorName(profile?.display_name || '');
  };

  // Employer confirms completion & pays
  const handleConfirmComplete = async () => {
    if (!job.accepted_by) return;
    const salaryAmount = parseInt(job.salary) || 0;

    const result = await Swal.fire({
      icon: 'question',
      title: l('ຢືນຢັນງານສຳເລັດ?', 'ยืนยันงานเสร็จ?', 'Confirm job complete?'),
      html: salaryAmount > 0 ? l(`ຈະໂອນ ${salaryAmount.toLocaleString()} ຫຼຽນ ໃຫ້ຜູ້ຮັບງານ`, `จะโอน ${salaryAmount.toLocaleString()} เหรียญ ให้ผู้รับงาน`, `Transfer ${salaryAmount.toLocaleString()} coins to worker`) : '',
      showCancelButton: true,
      confirmButtonText: l('ຢືນຢັນ & ຈ່າຍ', 'ยืนยัน & จ่าย', 'Confirm & Pay'),
      cancelButtonText: l('ຍົກເລີກ', 'ยกเลิก', 'Cancel'),
      confirmButtonColor: 'hsl(142, 76%, 36%)',
    });
    if (!result.isConfirmed) return;

    // Transfer coins if salary > 0
    if (salaryAmount > 0) {
      const { data: success } = await supabase.rpc('transfer_coins' as any, {
        _to_user_id: job.accepted_by,
        _amount: salaryAmount,
        _description: `${l('ຈ່າຍຄ່າງານ', 'จ่ายค่างาน', 'Job payment')}: ${job.title}`,
      });
      if (!success) {
        Swal.fire({ icon: 'error', title: l('ຫຼຽນບໍ່ພໍ', 'เหรียญไม่พอ', 'Not enough coins'), text: l('ກະລຸນາເຕີມຫຼຽນກ່ອນ', 'กรุณาเติมเหรียญก่อน', 'Please top up coins first') });
        return;
      }
    }

    await supabase.from('jobs').update({ status: 'completed' } as any).eq('id', job.id);
    Swal.fire({ icon: 'success', title: l('ສຳເລັດ! ຈ່າຍແລ້ວ', 'สำเร็จ! จ่ายแล้ว', 'Complete! Paid'), timer: 2000, showConfirmButton: false });
    setJob({ ...job, status: 'completed' });
  };

  const isOwner = user?.id === job.user_id;
  const isAcceptor = user?.id === job.accepted_by;
  const isAccepted = job.status === 'accepted';
  const isCompleted = job.status === 'completed';
  const isActive = job.status === 'active';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1 max-w-3xl">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> {t('nav.findJobs', language)}
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            {/* Status banner */}
            {isAccepted && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-800 text-sm">{l('ງານຖືກຮັບແລ້ວ', 'งานถูกรับแล้ว', 'Job Accepted')}</div>
                  <div className="text-xs text-blue-600">{l('ໂດຍ', 'โดย', 'By')}: {acceptorName || '...'}</div>
                </div>
              </div>
            )}
            {isCompleted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="font-semibold text-green-800 text-sm">{l('ງານສຳເລັດແລ້ວ ✅', 'งานเสร็จแล้ว ✅', 'Job Completed ✅')}</div>
              </div>
            )}

            <div className="flex items-start gap-3 flex-wrap mb-4">
              {job.is_featured && <Badge className="gap-1 bg-accent text-accent-foreground"><Star className="h-3 w-3" /> {l('ແນະນຳ', 'แนะนำ', 'Featured')}</Badge>}
              {job.is_urgent && <Badge variant="destructive" className="gap-1"><Flame className="h-3 w-3" /> {t('job.urgent', language)}</Badge>}
              <Badge variant={job.post_type === 'hiring' ? 'default' : 'secondary'}>
                {t(job.post_type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
              </Badge>
              <Badge variant="outline" className={isCompleted ? 'border-green-500 text-green-700' : isAccepted ? 'border-blue-500 text-blue-700' : ''}>
                {isCompleted ? l('ສຳເລັດ', 'เสร็จ', 'Done') : isAccepted ? l('ກຳລັງເຮັດ', 'กำลังทำ', 'In Progress') : l('ເປີດຮັບ', 'เปิดรับ', 'Open')}
              </Badge>
            </div>

            {(job as any).image_url && (
              <img src={(job as any).image_url} alt={job.title} className="w-full max-h-64 object-cover rounded-lg mb-4" />
            )}

            <h1 className="text-2xl font-bold mb-2">{job.title}</h1>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-muted-foreground">{t('job.postedBy', language)}: <Link to={`/user/${job.user_id}`} className="text-primary hover:underline">{job.poster_name}</Link></p>
              {posterRating && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {posterRating.avg} ({posterRating.count})
                </Badge>
              )}
            </div>

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
                  <div className="text-sm text-muted-foreground">{l('ກຳນົດເວລາ', 'กำหนดการ', 'Work Schedule')}</div>
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
                {isGoogleMapLink ? (
                  <a href={job.address} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">📍 {l('ເບິ່ງແຜນທີ່', 'ดูแผนที่', 'View on Map')}</a>
                ) : (
                  <span>{job.address}</span>
                )}
              </div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /><a href={`tel:${job.phone}`} className="text-primary hover:underline">{job.phone}</a></div>
            </div>

            <div className="rounded-xl overflow-hidden border h-[250px] mb-4">
              <MapContainer center={[lat, lng]} zoom={14} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[lat, lng]}><Popup>{job.title} - {job.address}</Popup></Marker>
              </MapContainer>
            </div>

            <div className="flex gap-3 flex-wrap">
              {/* Accept Job button - for non-owners on active hiring jobs */}
              {user && !isOwner && isActive && job.post_type === 'hiring' && (
                <Button size="lg" className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={handleAcceptJob}>
                  <HandCoins className="h-4 w-4" /> {l('ຮັບງານນີ້', 'รับงานนี้', 'Accept Job')}
                </Button>
              )}

              {/* Employer confirm completion */}
              {isOwner && isAccepted && (
                <Button size="lg" className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={handleConfirmComplete}>
                  <CheckCircle className="h-4 w-4" /> {l('ຢືນຢັນສຳເລັດ & ຈ່າຍ', 'ยืนยันเสร็จ & จ่าย', 'Confirm & Pay')}
                </Button>
              )}

              <Button size="lg" className="flex-1 gap-2" asChild>
                <a href={`tel:${job.phone}`}><Phone className="h-4 w-4" /> {t('job.contact', language)}</a>
              </Button>
              {user && user.id !== job.user_id && (
                <>
                  <Button size="lg" variant="outline" className="flex-1 gap-2" onClick={handleChat}>
                    <MessageCircle className="h-4 w-4" /> {l('ແຊັດ', 'แชท', 'Chat')}
                  </Button>
                  {isCompleted && (
                    <Button size="lg" variant="secondary" className="gap-2" onClick={() => setShowReview(true)}>
                      <Star className="h-4 w-4" /> {l('ລີວິວ', 'รีวิว', 'Review')}
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
      <Footer />

      {showReview && (
        <ReviewDialog
          open={showReview}
          onClose={() => setShowReview(false)}
          reviewedId={job.user_id}
          reviewedName={job.poster_name}
          jobId={job.id}
        />
      )}
    </div>
  );
};

export default JobDetailPage;
