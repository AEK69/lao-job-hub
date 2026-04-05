import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AuditLog {
  id: string; user_id: string | null; action: string; target_table: string | null;
  target_id: string | null; old_value: any; new_value: any; created_at: string;
}

const PAGE_SIZE = 50;

const AuditLogPage = () => {
  const { language } = useAppStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);

  const l = (lo: string, en: string) => language === 'en' ? en : lo;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (search) query = query.ilike('action', `%${search}%`);
    if (actionFilter !== 'all') query = query.ilike('action', `%${actionFilter}%`);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, count } = await query;
    setLogs((data || []) as AuditLog[]);
    setTotal(count || 0);
    setLoading(false);
  }, [search, actionFilter, dateFrom, dateTo, page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const exportCSV = () => {
    const csv = [['Date', 'Action', 'Table', 'Target ID'].join(','),
      ...logs.map(l => [new Date(l.created_at).toLocaleString('en-GB'), `"${l.action}"`, l.target_table, l.target_id?.slice(0, 8)].join(','))
    ].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'audit-logs.csv'; a.click();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{l('ບັນທຶກກິດຈະກຳ', 'Audit Log')}</h2>
        <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1"><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={l('ຄົ້ນຫາ...', 'Search...')} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{l('ທັງໝົດ', 'All')}</SelectItem>
            <SelectItem value="ສ້າງ">{l('ສ້າງ', 'Create')}</SelectItem>
            <SelectItem value="ສະຖານະ">{l('ສະຖານະ', 'Status')}</SelectItem>
            <SelectItem value="ຊຳລະ">{l('ຊຳລະ', 'Payment')}</SelectItem>
            <SelectItem value="ມອບໝາຍ">{l('ມອບໝາຍ', 'Assign')}</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-[140px]" />
        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-[140px]" />
      </div>

      <div className="space-y-2">
        {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> :
          logs.length === 0 ? <div className="text-center py-8 text-muted-foreground">{l('ບໍ່ມີບັນທຶກ', 'No logs')}</div> :
          logs.map(log => (
            <Card key={log.id} className="p-3 cursor-pointer hover:bg-muted/30" onClick={() => setDetailLog(log)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{log.action}</div>
                  <div className="text-xs text-muted-foreground">{log.target_table} • {log.target_id?.slice(0, 8)}</div>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </Card>
          ))
        }
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{l('ລາຍລະອຽດ', 'Details')}</DialogTitle></DialogHeader>
          {detailLog && (
            <div className="space-y-3 text-sm">
              <div><strong>{l('ການກະທຳ', 'Action')}:</strong> {detailLog.action}</div>
              <div><strong>{l('ຕາຕະລາງ', 'Table')}:</strong> {detailLog.target_table}</div>
              <div><strong>ID:</strong> {detailLog.target_id}</div>
              <div><strong>{l('ເວລາ', 'Time')}:</strong> {new Date(detailLog.created_at).toLocaleString('en-GB')}</div>
              {detailLog.old_value && <div><strong>{l('ຄ່າເກົ່າ', 'Old')}:</strong><pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto max-h-40">{JSON.stringify(detailLog.old_value, null, 2)}</pre></div>}
              {detailLog.new_value && <div><strong>{l('ຄ່າໃໝ່', 'New')}:</strong><pre className="bg-muted p-2 rounded text-xs mt-1 overflow-auto max-h-40">{JSON.stringify(detailLog.new_value, null, 2)}</pre></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogPage;
