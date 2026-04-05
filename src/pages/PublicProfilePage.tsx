import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore, Job } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, Briefcase, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { districts } from '@/lib/i18n';
import { JobCard } from '@/components/JobCard';

interface PublicProfile {
  display_name: string;
  avatar_url: string | null;
  district: string | null;
  bio: string | null;
  kyc_status: string;
  created_at: string;
  user_id: string;
}

const PublicProfilePage = () => {
  const { userId } = useParams();
  const { language } = useAppStore();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const [profileRes, reviewsRes, jobsRes] = await Promise.all([
        supabase.from('profiles').select('display_name, avatar_url, district, bio, kyc_status, created_at, user_id').eq('user_id', userId).single(),
        supabase.from('reviews').select('*').eq('reviewed_id', userId).order('created_at', { ascending: false }),
        supabase.from('jobs').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(10),
      ]);
      setProfile(profileRes.data as PublicProfile | null);
      setReviews(reviewsRes.data || []);
      setJobs((jobsRes.data as Job[]) || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return <div className="min-h-screen flex flex-col"><Header /><div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-2xl">⏳</div></div><Footer /></div>;
  if (!profile) return <div className="min-h-screen flex flex-col"><Header /><div className="flex-1 flex items-center justify-center"><p>Not found</p></div><Footer /></div>;

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const district = districts.find(d => d.id === profile.district);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-8 flex-1 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile Header */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{profile.display_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                  {profile.kyc_status === 'approved' && (
                    <Badge className="gap-1 bg-green-100 text-green-700"><ShieldCheck className="h-3 w-3" /> {l('ຢືນຢັນແລ້ວ', 'ยืนยันแล้ว', 'Verified')}</Badge>
                  )}
                </div>
                {district && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-4 w-4" /> {district[language] || district.lo}</p>
                )}
                {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  {l('ເຂົ້າຮ່ວມ', 'เข้าร่วม', 'Joined')} {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Rating Summary */}
            {avgRating && (
              <div className="mt-4 flex items-center gap-3 bg-yellow-50 rounded-lg p-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`h-5 w-5 ${s <= Math.round(Number(avgRating)) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="font-bold text-lg">{avgRating}</span>
                <span className="text-sm text-muted-foreground">({reviews.length} {l('ລີວິວ', 'รีวิว', 'reviews')})</span>
              </div>
            )}
          </Card>

          {/* Jobs */}
          {jobs.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Briefcase className="h-5 w-5" /> {l('ວຽກທີ່ໂພສ', 'งานที่โพสต์', 'Posted Jobs')}</h2>
              <div className="space-y-3">
                {jobs.map((job, i) => <JobCard key={job.id} job={job} index={i} />)}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Star className="h-5 w-5" /> {l('ລີວິວ', 'รีวิว', 'Reviews')} ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">{l('ຍັງບໍ່ມີລີວິວ', 'ยังไม่มีรีวิว', 'No reviews yet')}</Card>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`h-4 w-4 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="text-sm">{r.comment}</p>}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default PublicProfilePage;
