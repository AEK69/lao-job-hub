import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore, Job } from '@/lib/store';
import { t, districts } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Phone, Clock, Flame, ArrowLeft, MessageCircle, Star, CheckCircle, HandCoins, XCircle } from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
      setJob(data as Job | null);
      setLoading(false);

      if (data) {
        const { data: reviews } = await supabase.from('reviews').select('rating').eq('reviewed_id', data.user_id).eq('status', 'approved');
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

  // Realtime: react to job updates (other side confirms / cancels / payout)
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`job:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${id}` },
        (payload) => setJob(payload.new as Job))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
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
      html: l(
        `ຄ່າຕອບແທນ: <b>${formatSalary(job.salary)}₭</b><br/><small>ເງິນຈະຖືກພັກໄວ້ໃນລະບົບຈົນກວ່າທັງສອງຝ່າຍຍືນຢັນຈົບງານ</small>`,
        `ค่าตอบแทน: <b>${formatSalary(job.salary)}₭</b><br/><small>เงินจะถูกพักไว้ในระบบจนกว่าทั้งสองฝ่ายยืนยันงานเสร็จ</small>`,
        `Pay: <b>${formatSalary(job.salary)}₭</b><br/><small>Funds held in escrow until both confirm completion</small>`
      ),
      showCancelButton: true,
      confirmButtonText: l('ຮັບງານ', 'รับงาน', 'Accept'),
      cancelButtonText: l('ຍົກເລີກ', 'ยกเลิก', 'Cancel'),
      confirmButtonColor: 'hsl(142, 76%, 36%)',
    });
    if (!result.isConfirmed) return;

    const { data, error } = await supabase.rpc('accept_job_escrow' as any, { _job_id: job.id });
    if (error || !(data as any)?.success) {
      Swal.fire({ icon: 'error', title: l('ຮັບງານບໍ່ສຳເລັດ', 'รับงานไม่สำเร็จ', 'Could not accept'), text: (data as any)?.error || error?.message });
      return;
    }

    await Swal.fire({ icon: 'success', title: l('ຮັບງານສຳເລັດ! ກຳລັງເປີດແຊັດ...', 'รับงานสำเร็จ! กำลังเปิดแชท...', 'Accepted! Opening chat...'), timer: 1500, showConfirmButton: false });
    navigate(`/chat?job=${job.id}&to=${job.user_id}`);
  };

  // Either party confirms completion; payout when both confirmed
  const handleConfirmDone = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: l('ຢືນຢັນວ່າງານສຳເລັດ?', 'ยืนยันว่างานเสร็จ?', 'Confirm job done?'),
      text: l('ເງິນຈະຈ່າຍໃຫ້ຜູ້ຮັບງານເມື່ອທັງສອງຝ່າຍຍືນຢັນ', 'เงินจะจ่ายให้ผู้รับงานเมื่อทั้งสองฝ่ายยืนยัน', 'Payout happens when both sides confirm'),
      showCancelButton: true,
      confirmButtonText: l('ຍືນຢັນ', 'ยืนยัน', 'Confirm'),
      cancelButtonText: l('ຍົກເລີກ', 'ยกเลิก', 'Cancel'),
      confirmButtonColor: 'hsl(142, 76%, 36%)',
    });
    if (!result.isConfirmed) return;

    const { data, error } = await supabase.rpc('confirm_job_completion' as any, { _job_id: job.id });
    if (error || !(data as any)?.success) {
      Swal.fire({ icon: 'error', text: (data as any)?.error || error?.message });
      return;
    }
    if ((data as any).completed) {
      Swal.fire({ icon: 'success', title: l('ສຳເລັດ! ຈ່າຍແລ້ວ', 'สำเร็จ! จ่ายแล้ว', 'Complete! Paid'), timer: 1800, showConfirmButton: false });
      const { data: fresh } = await supabase.from('jobs').select('*').eq('id', job.id).single();
      if (fresh) setJob(fresh as Job);
    } else {
      Swal.fire({ icon: 'info', title: l('ຍືນຢັນແລ້ວ', 'ยืนยันแล้ว', 'Confirmed'), text: l('ລໍຖ້າອີກຝ່າຍຍືນຢັນ', 'รออีกฝ่ายยืนยัน', 'Waiting for the other party'), timer: 1800, showConfirmButton: false });
      const { data: fresh } = await supabase.from('jobs').select('*').eq('id', job.id).single();
      if (fresh) setJob(fresh as Job);
    }
  };

  // Cancel an accepted job — refund employer, reopen
  const handleCancelAccepted = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: l('ຍົກເລີກງານ?', 'ยกเลิกงาน?', 'Cancel job?'),
      text: l('ເງິນຈະຖືກຄືນໃຫ້ຜູ້ວ່າຈ້າງ ແລະ ງານຈະເປີດໃຫ້ຄົນອື່ນຮັບໄດ້ອີກ', 'เงินจะถูกคืนให้ผู้ว่าจ้าง และงานจะเปิดให้คนอื่นรับได้อีก', 'Funds return to employer; job reopens'),
      showCancelButton: true,
      confirmButtonText: l('ຍົກເລີກງານ', 'ยกเลิกงาน', 'Cancel job'),
      cancelButtonText: l('ກັບ', 'กลับ', 'Back'),
      confirmButtonColor: 'hsl(0, 72%, 51%)',
    });
    if (!result.isConfirmed) return;

    const { data, error } = await supabase.rpc('cancel_accepted_job' as any, { _job_id: job.id });
    if (error || !(data as any)?.success) {
      Swal.fire({ icon: 'error', text: (data as any)?.error || error?.message });
      return;
    }
    Swal.fire({ icon: 'success', title: l('ຍົກເລີກສຳເລັດ', 'ยกเลิกสำเร็จ', 'Cancelled'), timer: 1500, showConfirmButton: false });
    const { data: fresh } = await supabase.from('jobs').select('*').eq('id', job.id).single();
    if (fresh) { setJob(fresh as Job); setAcceptorName(null); }
  };

  const isOwner = user?.id === job.user_id;
  const isAcceptor = user?.id === job.accepted_by;
  const isAccepted = job.status === 'accepted';
  const isCompleted = job.status === 'completed';
  const isActive = job.status === 'active';

  const empConf = (job as any).employer_confirmed;
  const wrkConf = (job as any).worker_confirmed;
  const steps = [
    { key: 'accepted', label: l('ຮັບງານ', 'รับงาน', 'Accepted'), done: isAccepted || isCompleted },
    { key: 'waiting',  label: l('ລໍຍືນຢັນ', 'รอยืนยัน', 'Awaiting confirm'), done: (isAccepted && (empConf || wrkConf)) || isCompleted },
    { key: 'paying',   label: l('ກຳລັງຈ່າຍ', 'กำลังจ่าย', 'Paying out'), done: isCompleted || (isAccepted && empConf && wrkConf) },
    { key: 'done',     label: l('ສຳເລັດ', 'สำเร็จ', 'Done'), done: isCompleted },
  ];

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
                  <div className="text-xs text-blue-700 mt-1">
                    💰 {l('ເງິນພັກໄວ້', 'เงินพักไว้', 'Escrow')}: {((job as any).escrow_amount || 0).toLocaleString()}₭
                    {' · '}
                    {l('ຜູ້ວ່າຈ້າງ', 'ผู้ว่าจ้าง', 'Employer')}: {(job as any).employer_confirmed ? '✅' : '⏳'}
                    {' · '}
                    {l('ຜູ້ຮັບງານ', 'ผู้รับงาน', 'Worker')}: {(job as any).worker_confirmed ? '✅' : '⏳'}
                  </div>
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
                <Button size="lg" className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={handleAcceptJob} disabled={submitting}>
                  <HandCoins className="h-4 w-4" /> {l('ຮັບງານນີ້', 'รับงานนี้', 'Accept Job')}
                </Button>
              )}

              {/* Either party confirms completion */}
              {(isOwner || isAcceptor) && isAccepted && (
                <>
                  {!((isOwner && (job as any).employer_confirmed) || (isAcceptor && (job as any).worker_confirmed)) && (
                    <Button size="lg" className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={handleConfirmDone} disabled={submitting}>
                      <CheckCircle className="h-4 w-4" /> {l('ຍືນຢັນສຳເລັດ', 'ยืนยันเสร็จ', 'Confirm Done')}
                    </Button>
                  )}
                  {((isOwner && (job as any).employer_confirmed) || (isAcceptor && (job as any).worker_confirmed)) && (
                    <div className="flex-1 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                      ⏳ {l('ທ່ານຍືນຢັນແລ້ວ ລໍອີກຝ່າຍ', 'คุณยืนยันแล้ว รออีกฝ่าย', 'You confirmed — waiting for other party')}
                    </div>
                  )}
                  <Button size="lg" variant="destructive" className="gap-2" onClick={handleCancelAccepted} disabled={submitting}>
                    <XCircle className="h-4 w-4" /> {l('ຍົກເລີກງານ', 'ยกเลิกงาน', 'Cancel Job')}
                  </Button>
                </>
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
