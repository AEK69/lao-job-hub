import { useState, useEffect } from 'react';
import { useAppStore, Job } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Phone, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Navigate, Link } from 'react-router-dom';
import { ALLOWED_TRANSITIONS } from '@/components/StatusStepper';
import { StatusStepper } from '@/components/StatusStepper';
import { JobsListSkeleton } from '@/components/LoadingSkeleton';

const MyJobsPage = () => {
  const { language } = useAppStore();
  const { user, userRole, staffProfile } = useAuth();
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [doneJobs, setDoneJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateModal, setUpdateModal] = useState<Job | null>(null);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const l = (lo: string, en: string) => language === 'en' ? en : lo;

  useEffect(() => {
    if (!staffProfile) return;
    const load = async () => {
      setLoading(true);
      const [active, done] = await Promise.all([
        supabase.from('jobs').select('*').eq('assigned_staff_id', staffProfile.id).not('job_status', 'in', '("done","cancel")').order('scheduled_date'),
        supabase.from('jobs').select('*').eq('assigned_staff_id', staffProfile.id).eq('job_status', 'done').order('updated_at', { ascending: false }).limit(30),
      ]);
      setActiveJobs((active.data as Job[]) || []);
      setDoneJobs((done.data as Job[]) || []);
      setLoading(false);
    };
    load();
  }, [staffProfile]);

  if (!user) return <Navigate to="/auth" />;
  if (userRole !== 'staff') return <Navigate to="/" />;

  const handleUpdate = async () => {
    if (!updateModal) return;
    const next = ALLOWED_TRANSITIONS[updateModal.job_status];
    if (!next || next === 'payment') return;
    setUpdating(true);
    const { error } = await supabase.from('jobs').update({ job_status: next } as any).eq('id', updateModal.id);
    if (error) { toast.error(error.message); setUpdating(false); return; }
    await supabase.from('audit_logs').insert({
      action: `${updateModal.job_status} → ${next}${note ? ` (${note})` : ''}`,
      target_table: 'jobs', target_id: updateModal.id, user_id: user.id,
    } as any);
    toast.success(l('ອັດເດດສຳເລັດ', 'Updated'));
    setUpdateModal(null);
    setNote('');
    setUpdating(false);
    // Reload
    const [active, done] = await Promise.all([
      supabase.from('jobs').select('*').eq('assigned_staff_id', staffProfile!.id).not('job_status', 'in', '("done","cancel")').order('scheduled_date'),
      supabase.from('jobs').select('*').eq('assigned_staff_id', staffProfile!.id).eq('job_status', 'done').order('updated_at', { ascending: false }).limit(30),
    ]);
    setActiveJobs((active.data as Job[]) || []);
    setDoneJobs((done.data as Job[]) || []);
  };

  const urgentCount = activeJobs.filter(j => j.priority !== 'normal').length;

  const JobCardMobile = ({ job, showAction = true }: { job: Job; showAction?: boolean }) => {
    const next = ALLOWED_TRANSITIONS[job.job_status];
    const nextLabel = next === 'active' ? l('ເລີ່ມດຳເນີນງານ', 'Start Work') :
      next === 'quality_check' ? l('ສົ່ງກວດຄຸນນະພາບ', 'Submit for QC') : null;

    return (
      <Card className="mb-3">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold">{job.job_number}</span>
            <div className="flex gap-1">
              {job.priority !== 'normal' && <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />{job.priority === 'critical' ? l('ວິກິດ', 'Critical') : l('ດ່ວນ', 'Urgent')}</Badge>}
              <Badge variant="outline" className="text-xs">{job.job_status}</Badge>
            </div>
          </div>
          <StatusStepper status={job.job_status} language={language} />
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{job.customer_name}</div>
            <a href={`tel:${job.customer_phone}`} className="text-primary flex items-center gap-1"><Phone className="h-3 w-3" />{job.customer_phone}</a>
            {job.customer_address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(job.customer_address)}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <MapPin className="h-3 w-3" />{job.customer_address}
              </a>
            )}
            <div className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3" />{job.scheduled_date} {job.scheduled_time}</div>
          </div>
          <div className="text-sm"><Badge variant="outline">{job.job_type}</Badge></div>
          {showAction && nextLabel && (
            <Button className="w-full min-h-[48px] text-base" onClick={() => setUpdateModal(job)}>{nextLabel}</Button>
          )}
          <Link to={`/jobs/${job.id}`}><Button variant="outline" className="w-full min-h-[48px]">{l('ເບິ່ງລາຍລະອຽດ', 'View Details')}</Button></Link>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <div className="bg-primary text-primary-foreground p-6">
        <h1 className="text-xl font-bold">{l('ສະບາຍດີ', 'Hello')}, {staffProfile?.name}</h1>
        <p className="text-sm opacity-80">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <div className="flex gap-4 mt-3">
          <div className="bg-white/20 rounded-lg px-4 py-2"><div className="text-xl font-bold">{activeJobs.length}</div><div className="text-xs">{l('ງານທີ່ຮັບ', 'Active')}</div></div>
          <div className="bg-white/20 rounded-lg px-4 py-2"><div className="text-xl font-bold">{urgentCount}</div><div className="text-xs">{l('ງານດ່ວນ', 'Urgent')}</div></div>
        </div>
      </div>

      <div className="container py-4 flex-1">
        {loading ? <JobsListSkeleton count={3} /> : (
          <Tabs defaultValue="active">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="active" className="flex-1">{l('ກຳລັງດຳເນີນ', 'Active')} ({activeJobs.length})</TabsTrigger>
              <TabsTrigger value="done" className="flex-1">{l('ສຳເລັດແລ້ວ', 'Completed')} ({doneJobs.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              {activeJobs.length === 0 ? <div className="text-center py-12 text-muted-foreground"><span className="text-5xl block mb-3">✅</span><p>{l('ບໍ່ມີງານ', 'No active jobs')}</p></div>
                : activeJobs.map(j => <JobCardMobile key={j.id} job={j} />)}
            </TabsContent>
            <TabsContent value="done">
              {doneJobs.length === 0 ? <div className="text-center py-12 text-muted-foreground"><p>{l('ບໍ່ມີປະຫວັດ', 'No history')}</p></div>
                : doneJobs.map(j => <JobCardMobile key={j.id} job={j} showAction={false} />)}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Status Update Modal */}
      <Dialog open={!!updateModal} onOpenChange={() => setUpdateModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{l('ອັດເດດສະຖານະ', 'Update Status')}</DialogTitle></DialogHeader>
          {updateModal && (
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded"><span className="text-sm">{updateModal.job_number} — {updateModal.customer_name}</span></div>
              <StatusStepper status={updateModal.job_status} language={language} />
              <Textarea placeholder={l('ໝາຍເຫດ / ລາຍງານ (ທາງເລືອກ)', 'Notes (optional)')} value={note} onChange={e => setNote(e.target.value)} rows={3} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateModal(null)}>{l('ຍົກເລີກ', 'Cancel')}</Button>
            <Button onClick={handleUpdate} disabled={updating} className="min-h-[48px]">{l('ຢືນຢັນ', 'Confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Nav for Staff */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          <Link to="/my-jobs" className="flex flex-col items-center gap-1 text-primary"><span className="text-lg">📋</span><span className="text-[10px] font-medium">{l('ງານຂອງຂ້ອຍ', 'My Jobs')}</span></Link>
          <Link to="/profile" className="flex flex-col items-center gap-1 text-muted-foreground"><span className="text-lg">👤</span><span className="text-[10px] font-medium">{l('ໂປຣໄຟລ', 'Profile')}</span></Link>
        </div>
      </nav>
    </div>
  );
};

export default MyJobsPage;
