import { useState, useEffect } from 'react';
import { useAppStore, Job } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Briefcase, Users, Search, Eye, LogOut, Home, Settings, Edit, History, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';

interface StaffMember { id: string; user_id: string | null; name: string; phone: string | null; skills: string[]; status: string; created_at: string; }
interface Payment { id: string; job_id: string; amount: number; method: string; payment_type: string | null; reference_note: string | null; received_by: string | null; created_at: string; }
interface AuditLog { id: string; user_id: string | null; action: string; target_table: string | null; target_id: string | null; created_at: string; }

const AdminPage = () => {
  const { language } = useAppStore();
  const { user, role, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchJob, setSearchJob] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [editJobDialog, setEditJobDialog] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState<Partial<Job>>({});

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => { if (user && role === 'admin') loadAll(); }, [user, role]);

  const loadAll = async () => {
    const [j, s, p, a] = await Promise.all([
      supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('staff').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setJobs((j.data as Job[]) || []);
    setStaff((s.data as StaffMember[]) || []);
    setPayments((p.data as Payment[]) || []);
    setLogs((a.data as AuditLog[]) || []);
  };

  const handleDeleteJob = async (id: string) => {
    const r = await Swal.fire({ icon: 'warning', title: l('ລຶບງານ?', 'ลบงาน?', 'Delete?'), showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (!r.isConfirmed) return;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); loadAll(); }
  };

  const handleEditJob = (job: Job) => {
    setEditJobDialog(job);
    setEditForm({ customer_name: job.customer_name, description: job.description, base_price: job.base_price, job_status: job.job_status, priority: job.priority });
  };

  const handleSaveEdit = async () => {
    if (!editJobDialog) return;
    const { error } = await supabase.from('jobs').update(editForm as any).eq('id', editJobDialog.id);
    if (error) toast.error(error.message); else { toast.success('Saved'); setEditJobDialog(null); loadAll(); }
  };

  const exportCSV = () => {
    const headers = ['Job#', 'Customer', 'Type', 'Status', 'Total', 'Payment', 'Date'];
    const rows = jobs.map(j => [j.job_number, j.customer_name, j.job_type, j.job_status, j.total_price, j.payment_status, new Date(j.created_at).toLocaleDateString()]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'jobs.csv'; a.click();
  };

  if (!user) return <Navigate to="/admin-login" />;
  if (role !== 'admin') return (
    <div className="min-h-screen flex items-center justify-center"><Card className="p-8 text-center"><span className="text-5xl block mb-4">🔒</span><p className="text-muted-foreground mb-4">{l('ຕ້ອງເປັນ Admin', 'ต้องเป็น Admin', 'Admin required')}</p><Link to="/"><Button>Home</Button></Link></Card></div>
  );

  const filteredJobs = jobs.filter(j => {
    const ms = !searchJob || j.job_number.toLowerCase().includes(searchJob.toLowerCase()) || j.customer_name.toLowerCase().includes(searchJob.toLowerCase());
    const mf = jobStatusFilter === 'all' || j.job_status === jobStatusFilter;
    return ms && mf;
  });

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="hidden lg:flex w-64 bg-card border-r flex-col">
        <div className="p-6 border-b"><h1 className="text-xl font-bold text-primary flex items-center gap-2"><Settings className="h-5 w-5" /> Admin</h1></div>
        <nav className="flex-1 p-4"><Link to="/"><Button variant="ghost" className="w-full justify-start gap-2"><Home className="h-4 w-4" /> Home</Button></Link></nav>
        <div className="p-4 border-t"><Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={signOut}><LogOut className="h-4 w-4" /> Logout</Button></div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b px-6 py-4 sticky top-0 z-10">
          <h2 className="text-lg font-bold">{l('ແຜງຄວບຄຸມ', 'แผงควบคุม', 'Dashboard')}</h2>
        </header>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: l('ງານທັງໝົດ', 'งานทั้งหมด', 'Total Jobs'), value: jobs.length },
              { label: l('ກຳລັງດຳເນີນ', 'กำลังดำเนิน', 'Active'), value: jobs.filter(j => j.job_status === 'active').length },
              { label: l('ພະນັກງານ', 'พนักงาน', 'Staff'), value: staff.length },
              { label: l('ລາຍການຈ່າຍ', 'รายการจ่าย', 'Payments'), value: payments.length },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="p-4"><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></Card>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="jobs" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="jobs" className="gap-1"><Briefcase className="h-4 w-4" /> {l('ງານ', 'งาน', 'Jobs')}</TabsTrigger>
              <TabsTrigger value="staff" className="gap-1"><Users className="h-4 w-4" /> {l('ພະນັກງານ', 'พนักงาน', 'Staff')}</TabsTrigger>
              <TabsTrigger value="payments" className="gap-1">💰 {l('ຈ່າຍ', 'จ่าย', 'Pay')}</TabsTrigger>
              <TabsTrigger value="logs" className="gap-1"><History className="h-4 w-4" /> Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchJob} onChange={e => setSearchJob(e.target.value)} className="pl-10" /></div>
                <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['all', 'pending', 'active', 'quality_check', 'payment', 'done', 'cancel'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="gap-2" onClick={exportCSV}><Download className="h-4 w-4" /> Export</Button>
              </div>
              {filteredJobs.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm">{job.job_number}</span>
                          <Badge variant="outline" className="text-[10px]">{job.job_status}</Badge>
                          <Badge variant="outline" className="text-[10px]">{job.priority}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{job.customer_name} • {job.job_type} • {(job.total_price || 0).toLocaleString()}₭</div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => handleEditJob(job)}><Edit className="h-3 w-3" /></Button>
                        <Button size="sm" variant="destructive" className="h-8" onClick={() => handleDeleteJob(job.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="staff" className="space-y-2">
              {staff.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No staff</Card> : staff.map(s => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div><div className="font-semibold text-sm">{s.name}</div><div className="text-xs text-muted-foreground">{s.phone} • {(s.skills || []).join(', ')}</div></div>
                    <Badge variant={s.status === 'available' ? 'default' : 'secondary'}>{s.status}</Badge>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="payments" className="space-y-2">
              {payments.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No payments</Card> : payments.map(p => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm font-medium">{p.amount.toLocaleString()}₭ • {p.method}</div><div className="text-xs text-muted-foreground">{p.payment_type} • {p.reference_note || '-'}</div></div>
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="logs" className="space-y-2">
              {logs.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No logs</Card> : logs.map(log => (
                <Card key={log.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm font-medium">{log.action}</div><div className="text-xs text-muted-foreground">{log.target_table} • {log.target_id?.slice(0, 8)}</div></div>
                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {editJobDialog && (
        <Dialog open={!!editJobDialog} onOpenChange={() => setEditJobDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Job {editJobDialog.job_number}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input value={editForm.customer_name || ''} onChange={e => setEditForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Customer" />
              <Textarea value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
              <Input type="number" value={editForm.base_price || 0} onChange={e => setEditForm(p => ({ ...p, base_price: Number(e.target.value) }))} placeholder="Base Price" />
              <Select value={editForm.job_status || 'pending'} onValueChange={v => setEditForm(p => ({ ...p, job_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['pending', 'active', 'quality_check', 'payment', 'done', 'cancel'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={editForm.priority || 'normal'} onValueChange={v => setEditForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['normal', 'urgent', 'critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditJobDialog(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminPage;
