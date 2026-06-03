import { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Loader as Loader2, Sparkles, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'มีผู้ใช้ทั้งหมดกี่คน และกี่คนที่ KYC ยังไม่ผ่าน?',
  'สรุปสถานะงานปัจจุบัน (active/accepted/completed)',
  'มีเหรียญรวมในระบบเท่าไหร่?',
  'อธิบายขั้นตอน escrow ของแพลตฟอร์ม',
  'ฉันควรโฟกัสอะไรในสัปดาห์นี้?',
];

export function AdminAIAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const userMsg: Msg = { role: 'user', content };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Session expired'); setLoading(false); return; }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: history, lang: 'th' }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error('ใช้งานบ่อยเกินไป ลองใหม่อีกครู่');
        else if (resp.status === 402) toast.error('เครดิต AI หมด — เติมที่ Settings > Workspace');
        else if (resp.status === 403) toast.error('สำหรับ admin เท่านั้น');
        else toast.error(err.error || 'AI error');
        setMessages(messages);
        setLoading(false);
        return;
      }

      setMessages([...history, { role: 'assistant', content: '' }]);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let so_far = '';
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line?.endsWith?.('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const p = JSON.parse(json);
            const delta = p.choices?.[0]?.delta?.content;
            if (delta) {
              so_far += delta;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: so_far };
                return copy;
              });
              setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 0);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 flex flex-col h-[600px]">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold flex items-center gap-1.5">
            Admin AI Assistant <Bot className="h-4 w-4 text-primary" />
          </h3>
          <p className="text-xs text-muted-foreground">ผู้ช่วยข้อมูล/สถิติ/วิเคราะห์สำหรับ admin เท่านั้น</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">ลองถามดู:</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs p-2.5 rounded-lg border bg-muted/30 hover:bg-muted hover:border-primary transition"
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
                  <ReactMarkdown>{m.content || '...'}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
            {m.role === 'user' && (
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> กำลังคิด...
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 pt-3 border-t mt-3">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="ถามอะไรเกี่ยวกับเว็บก็ได้..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()} size="icon">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </Card>
  );
}

export default AdminAIAssistant;