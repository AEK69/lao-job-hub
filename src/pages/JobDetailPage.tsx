import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore, Job } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Phone, Clock, AlertTriangle, MapPin, Calendar, User, Camera, CreditCard, FileText, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { JobDetailSkeleton } from '@/components/LoadingSkeleton';
import { StatusStepper, ALLOWED_TRANSITIONS } from '@/components/StatusStepper';
import { ImageLightbox } from '@/components/ImageLightbox';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { timeAgo } from '@/lib/constants';

interface StaffMember { id: string; name: string; phone: string | null; status: string; }
interface Payment { id: string; amount: number; method: string; payment_type: string | null; reference_note: string | null; created_at: string; }
interface JobImage { id: string; image_url: string; image_type: string | null; created_at: string | null; }
interface AuditLog { id: string; action: string; old_value: any; new_value: any; created_at: string; }

const JobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useAppStore();
  const { user, userRole } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<StaffMember | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [images, setImages] = useState<JobImage[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: 0, method: 'cash', payment_type: 'full', reference_note: '' });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [uploading, setUploading] = useState(false);

  const l = (lo: string, en: string) => language === 'en' ? en : lo;
  const isAdmin = userRole === 'admin';
  const isCashier = userRole === 'cashier';
  const isStaff = userRole === 'staff';

  const loadJob = async () => {
    if (!id) return;
    const [jobRes, staffRes, payRes, imgRes, logRes] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', id).single(),
      supabase.from('staff').select('*').order('name'),
      supabase.from('payments').select('*').eq('job_id', id).order('created_at', { ascending: false }),
      supabase.from('job_images').select('*').eq('job_id', id).order('created_at'),
      supabase.from('audit_logs').select('*').eq('target_id', id).order('created_at', { ascending: false }).limit(50),
    ]);
    const jobData = jobRes.data as Job | null;
    setJob(jobData);
    const allStaff = (staffRes.data || []) as StaffMember[];
    setStaff(allStaff);
    if (jobData?.assigned_staff_id) {
      setAssignedStaff(allStaff.find(s => s.id === jobData.assigned_staff_id) || null);
    }
    setPayments((payRes.data || []) as Payment[]);
    setImages((imgRes.data || []) as JobImage[]);
    setLogs((logRes.data || []) as AuditLog[]);
    setLoading(false);
  };

  useEffect(() => { loadJob(); }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!job || !id) return;
    if (newStatus === 'done' && job.payment_status !== 'paid') {
      toast.error(l('ຕ້ອງຊຳລະກ່ອນປິດງານ', 'Must be paid before closing'));
      return;
    }
    const { error } = await supabase.from('jobs').update({ job_status: newStatus } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    await supabase.from('audit_logs').insert({ action: `ສະຖານະ: ${job.job_status} → ${newStatus}`, target_table: 'jobs', target_id: id, user_id: user?.id } as any);
    toast.success(l('ອັດເດດສະຖານະສຳເລັດ', 'Status updated'));
    loadJob();
  };

  const handleAssignStaff = async (staffId: string) => {
    if (!id) return;
    const { error } = await supabase.from('jobs').update({ assigned_staff_id: staffId } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    const s = staff.find(x => x.id === staffId);
    await supabase.from('audit_logs').insert({ action: `ມອບໝາຍ: ${s?.name || staffId}`, target_table: 'jobs', target_id: id, user_id: user?.id } as any);
    toast.success(l('ມອບໝາຍສຳເລັດ', 'Staff assigned'));
    loadJob();
  };

  const handlePayment = async () => {
    if (!job || !id || payForm.amount <= 0) return;
    const { error } = await supabase.from('payments').insert({
      job_id: id, amount: payForm.amount, method: payForm.method,
      payment_type: payForm.payment_type, reference_note: payForm.reference_note || null, received_by: user?.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    const newPaid = (job.amount_paid || 0) + payForm.amount;
    const newPayStatus = newPaid >= (job.total_price || 0) ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    await supabase.from('jobs').update({ amount_paid: newPaid, payment_status: newPayStatus } as any).eq('id', id);
    await supabase.from('audit_logs').insert({ action: `ຮັບຊຳລະ ${payForm.amount.toLocaleString()}₭ (${payForm.method})`, target_table: 'jobs', target_id: id, user_id: user?.id } as any);
    toast.success(l(`ຮັບຊຳລະ ${payForm.amount.toLocaleString()}₭ ສຳເລັດ`, `Payment of ${payForm.amount.toLocaleString()}₭ recorded`));
    setPaymentModal(false);
    setPayForm({ amount: 0, method: 'cash', payment_type: 'full', reference_note: '' });
    loadJob();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('job-images').upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('job-images').getPublicUrl(path);
    await supabase.from('job_images').insert({ job_id: id, image_url: urlData.publicUrl, image_type: type, uploaded_by: user?.id } as any);
    toast.success(l('ອັບໂຫລດສຳເລັດ', 'Image uploaded'));
    setUploading(false);
    loadJob();
  };

  if (loading) return <div className="min-h-screen flex flex-col"><Header /><div className="container py-6 flex-1"><JobDetailSkeleton /></div><Footer /></div>;
  if (!job) return <div className="min-h-screen flex flex-col"><Header /><div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">{l('ບໍ່ພົບງານ', 'Job not found')}</p></div><Footer /></div>;

  const remaining = Math.max(0, (job.total_price || 0) - (job.amount_paid || 0));
  const payPercent = job.total_price ? Math.min(100, ((job.amount_paid || 0) / job.total_price) * 100) : 0;
  const priorityColor = job.priority === 'critical' ? 'destructive' : job.priority === 'urgent' ? 'secondary' : 'outline';
  const priorityLabel = job.priority === 'critical' ? l('ດ່ວນຫຼາຍ', 'Critical') : job.priority === 'urgent' ? l('ດ່ວນ', 'Urgent') : l('ທຳມະດາ', 'Normal');
  const nextStatus = ALLOWED_TRANSITIONS[job.job_status];
  const beforeImages = images.filter(i => i.image_type === 'before' || i.image_type === 'other' || !i.image_type);
  const afterImages = images.filter(i => i.image_type === 'after');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> {l('ກັບຄືນ', 'Back')}
        </Link>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN - 3/5 */}
          <div className="lg:col-span-3 space-y-4">
            {/* Job Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="text-2xl font-bold">{job.job_number}</span>
                    <Badge variant={priorityColor as any}>{priorityLabel}</Badge>
                    <Badge variant={job.payment_status === 'paid' ? 'default' : 'outline'}>{job.payment_status}</Badge>
                  </div>
                  <StatusStepper status={job.job_status} language={language} />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                    <span><Clock className="h-3 w-3 inline mr-1" />{l('ສ້າງ', 'Created')}: {new Date(job.created_at).toLocaleDateString('en-GB')}</span>
                    <span>{l('ອັດເດດ', 'Updated')}: {timeAgo(job.updated_at, language as any)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> {l('ຂໍ້ມູນລູກຄ້າ', 'Customer Info')}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-muted-foreground">{l('ຊື່', 'Name')}</div><div className="font-semibold">{job.customer_name}</div></div>
                <div><div className="text-xs text-muted-foreground">{l('ໂທ', 'Phone')}</div><a href={`tel:${job.customer_phone}`} className="font-semibold text-primary hover:underline flex items-center gap-1"><Phone className="h-3 w-3" />{job.customer_phone}</a></div>
                {job.customer_address && <div className="col-span-2"><div className="text-xs text-muted-foreground">{l('ທີ່ຢູ່', 'Address')}</div><div className="font-semibold flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{job.customer_address}</div></div>}
                {(job.scheduled_date || job.scheduled_time) && <div className="col-span-2"><div className="text-xs text-muted-foreground">{l('ຈອງວັນ', 'Schedule')}</div><div className="font-semibold flex items-center gap-1"><Calendar className="h-3 w-3 text-muted-foreground" />{job.scheduled_date} {job.scheduled_time}</div></div>}
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> {l('ລາຍລະອຽດງານ', 'Job Details')}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><div className="text-xs text-muted-foreground">{l('ປະເພດງານ', 'Type')}</div><div className="font-semibold">{job.job_type}</div></div>
                  <div><div className="text-xs text-muted-foreground">{l('ລາຍລະອຽດ', 'Description')}</div><div className="text-sm">{job.description || '-'}</div></div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span>{l('ຄ່າບໍລິການ', 'Base')}</span><span>{(job.base_price || 0).toLocaleString()}₭</span></div>
                  <div className="flex justify-between text-sm"><span>{l('ຄ່າວັດສະດຸ', 'Material')}</span><span>{(job.material_cost || 0).toLocaleString()}₭</span></div>
                  {(job.discount || 0) > 0 && <div className="flex justify-between text-sm text-green-600"><span>{l('ສ່ວນຫຼຸດ', 'Discount')}</span><span>-{job.discount.toLocaleString()}₭</span></div>}
                  <div className="border-t pt-2 flex justify-between font-bold text-primary"><span>{l('ຍອດລວມ', 'Total')}</span><span>{(job.total_price || 0).toLocaleString()}₭</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4" /> {l('ຮູບພາບ', 'Images')}</CardTitle></CardHeader>
              <CardContent>
                <Tabs defaultValue="before">
                  <TabsList className="mb-3">
                    <TabsTrigger value="before">{l('ກ່ອນ', 'Before')} ({beforeImages.length})</TabsTrigger>
                    <TabsTrigger value="after">{l('ຫຼັງ', 'After')} ({afterImages.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="before">
                    {beforeImages.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">{l('ບໍ່ມີຮູບ', 'No images')}</p> : (
                      <div className="grid grid-cols-3 gap-2">{beforeImages.map((img, i) => (
                        <img key={img.id} src={img.image_url} alt="" className="rounded-lg aspect-square object-cover cursor-pointer hover:opacity-80" onClick={() => { setLightboxIdx(i); setLightboxOpen(true); }} />
                      ))}</div>
                    )}
                  </TabsContent>
                  <TabsContent value="after">
                    {afterImages.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">{l('ບໍ່ມີຮູບ', 'No images')}</p> : (
                      <div className="grid grid-cols-3 gap-2">{afterImages.map((img, i) => (
                        <img key={img.id} src={img.image_url} alt="" className="rounded-lg aspect-square object-cover cursor-pointer hover:opacity-80" onClick={() => { setLightboxIdx(i); setLightboxOpen(true); }} />
                      ))}</div>
                    )}
                  </TabsContent>
                </Tabs>
                {(isAdmin || isStaff) && (
                  <div className="flex gap-2 mt-3">
                    <label className="flex-1">
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'before')} />
                      <Button variant="outline" size="sm" className="w-full" disabled={uploading} asChild><span>📷 {l('ຮູບກ່ອນ', 'Before')}</span></Button>
                    </label>
                    <label className="flex-1">
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleImageUpload(e, 'after')} />
                      <Button variant="outline" size="sm" className="w-full" disabled={uploading} asChild><span>📷 {l('ຮູບຫຼັງ', 'After')}</span></Button>
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - 2/5 */}
          <div className="lg:col-span-2 space-y-4">
            {/* Staff Assignment */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> {l('ພະນັກງານ', 'Staff')}</CardTitle></CardHeader>
              <CardContent>
                {assignedStaff ? (
                  <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{assignedStaff.name[0]}</div>
                    <div><div className="font-semibold">{assignedStaff.name}</div>{assignedStaff.phone && <a href={`tel:${assignedStaff.phone}`} className="text-xs text-primary">{assignedStaff.phone}</a>}</div>
                  </div>
                ) : <p className="text-sm text-muted-foreground">{l('ຍັງບໍ່ມອບໝາຍ', 'Not assigned')}</p>}
                {isAdmin && (
                  <div className="mt-3">
                    <Select value={job.assigned_staff_id || ''} onValueChange={handleAssignStaff}>
                      <SelectTrigger><SelectValue placeholder={l('ເລືອກພະນັກງານ', 'Select staff')} /></SelectTrigger>
                      <SelectContent>
                        {staff.filter(s => s.status === 'available' || s.id === job.assigned_staff_id).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} ({s.status})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Status */}
            {!isStaff && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> {l('ການຊຳລະ', 'Payment')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{(job.amount_paid || 0).toLocaleString()}₭ / {(job.total_price || 0).toLocaleString()}₭</span>
                      <span className="text-muted-foreground">{Math.round(payPercent)}%</span>
                    </div>
                    <Progress value={payPercent} className="h-2" />
                    {remaining > 0 && <p className="text-xs text-muted-foreground mt-1">{l('ຄ້າງ', 'Remaining')}: {remaining.toLocaleString()}₭</p>}
                  </div>
                  {payments.length > 0 && (
                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                      {payments.map(p => (
                        <div key={p.id} className="flex justify-between text-sm bg-muted/30 p-2 rounded">
                          <span>{p.amount.toLocaleString()}₭ • {p.method}</span>
                          <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {remaining > 0 && (isAdmin || isCashier) && (
                      <Button size="sm" className="flex-1" onClick={() => { setPayForm(f => ({ ...f, amount: remaining })); setPaymentModal(true); }}>
                        💳 {l('ຮັບຊຳລະ', 'Record Payment')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Change */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> {l('ອັດເດດສະຖານະ', 'Update Status')}</CardTitle></CardHeader>
              <CardContent>
                {isAdmin ? (
                  <div className="space-y-2">
                    <Select value={job.job_status} onValueChange={handleStatusChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['pending', 'active', 'quality_check', 'payment', 'done', 'cancel'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : isStaff && nextStatus && nextStatus !== 'payment' ? (
                  <Button className="w-full" onClick={() => handleStatusChange(nextStatus)}>
                    {nextStatus === 'active' ? l('ເລີ່ມດຳເນີນງານ', 'Start Work') :
                     nextStatus === 'quality_check' ? l('ສົ່ງກວດຄຸນນະພາບ', 'Submit for QC') :
                     nextStatus}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">{l('ບໍ່ສາມາດອັດເດດ', 'No action available')}</p>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> {l('ກິດຈະກຳ', 'Activity')}</CardTitle></CardHeader>
              <CardContent>
                {logs.length === 0 ? <p className="text-sm text-muted-foreground">{l('ບໍ່ມີກິດຈະກຳ', 'No activity')}</p> : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {logs.map(log => (
                      <div key={log.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{new Date(log.created_at!).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={paymentModal} onOpenChange={setPaymentModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{l('ຮັບຊຳລະ', 'Record Payment')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{l('ຈຳນວນ', 'Amount')} (₭)</Label><Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
            <div><Label>{l('ວິທີຈ່າຍ', 'Method')}</Label>
              <Select value={payForm.method} onValueChange={v => setPayForm(f => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{l('ເງິນສົດ', 'Cash')}</SelectItem>
                  <SelectItem value="bcel">BCEL</SelectItem>
                  <SelectItem value="transfer">{l('ໂອນ', 'Transfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{l('ປະເພດ', 'Type')}</Label>
              <Select value={payForm.payment_type} onValueChange={v => setPayForm(f => ({ ...f, payment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">{l('ມັດຈຳ', 'Deposit')}</SelectItem>
                  <SelectItem value="partial">{l('ບາງສ່ວນ', 'Partial')}</SelectItem>
                  <SelectItem value="full">{l('ເຕັມ', 'Full')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{l('ໝາຍເຫດ', 'Note')}</Label><Input value={payForm.reference_note} onChange={e => setPayForm(f => ({ ...f, reference_note: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal(false)}>{l('ຍົກເລີກ', 'Cancel')}</Button>
            <Button onClick={handlePayment}>{l('ບັນທຶກ', 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageLightbox images={images} initialIndex={lightboxIdx} open={lightboxOpen} onOpenChange={setLightboxOpen} />
      <Footer />
    </div>
  );
};

export default JobDetailPage;
