import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

interface Conversation {
  id: string;
  job_id: string | null;
  participant_1: string;
  participant_2: string;
  updated_at: string;
  other_profile?: { display_name: string; avatar_url: string | null };
  job_title?: string;
  last_message?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const ChatPage = () => {
  const { user } = useAuth();
  const { language } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(searchParams.get('conv'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const labels = {
    title: { lo: 'ຂໍ້ຄວາມ', th: 'ข้อความ', en: 'Messages' },
    noConv: { lo: 'ຍັງບໍ່ມີການສົນທະນາ', th: 'ยังไม่มีการสนทนา', en: 'No conversations yet' },
    placeholder: { lo: 'ພິມຂໍ້ຄວາມ...', th: 'พิมพ์ข้อความ...', en: 'Type a message...' },
    loginFirst: { lo: 'ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ', th: 'กรุณาเข้าสู่ระบบก่อน', en: 'Please login first' },
  };
  const l = (key: keyof typeof labels) => labels[key][language] || labels[key].lo;

  // Check for new conversation from job detail
  useEffect(() => {
    const jobId = searchParams.get('job');
    const otherId = searchParams.get('to');
    if (jobId && otherId && user) {
      findOrCreateConversation(jobId, otherId);
    }
  }, [searchParams, user]);

  const findOrCreateConversation = async (jobId: string, otherId: string) => {
    // Check existing
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('job_id', jobId)
      .or(`and(participant_1.eq.${user!.id},participant_2.eq.${otherId}),and(participant_1.eq.${otherId},participant_2.eq.${user!.id})`)
      .maybeSingle();

    if (existing) {
      setActiveConvId(existing.id);
      return;
    }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ job_id: jobId, participant_1: user!.id, participant_2: otherId })
      .select('id')
      .single();

    if (newConv) setActiveConvId(newConv.id);
  };

  // Load conversations
  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (!convs) return;

    const enriched = await Promise.all(convs.map(async (conv) => {
      const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
      const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('user_id', otherId).single();
      
      let jobTitle = '';
      if (conv.job_id) {
        const { data: job } = await supabase.from('jobs').select('title').eq('id', conv.job_id).single();
        jobTitle = job?.title || '';
      }

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      return {
        ...conv,
        other_profile: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url } : undefined,
        job_title: jobTitle,
        last_message: lastMsg?.content,
        unread_count: count || 0,
      };
    }));

    setConversations(enriched);
  };

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId) return;
    loadMessages();

    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConvId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => [...prev, msg]);
        if (msg.sender_id !== user?.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then();
          // Show toast notification for new message
          const conv = conversations.find(c => c.id === msg.conversation_id);
          const senderName = conv?.other_profile?.display_name || '?';
          toast(
            `💬 ${senderName}: ${msg.content.slice(0, 50)}${msg.content.length > 50 ? '...' : ''}`,
            { duration: 5000 }
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConvId]);

  const loadMessages = async () => {
    if (!activeConvId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConvId)
      .order('created_at', { ascending: true });
    setMessages(data || []);

    // Mark as read
    if (user) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', activeConvId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConvId || !user || sending) return;
    setSending(true);
    await supabase.from('messages').insert({
      conversation_id: activeConvId,
      sender_id: user.id,
      content: newMsg.trim(),
    });
    setNewMsg('');
    setSending(false);

    // Update conversation timestamp
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvId);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="text-5xl block mb-4">💬</span>
            <p className="text-muted-foreground mb-4">{l('loginFirst')}</p>
            <Link to="/auth"><Button>{l('title')}</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-4 flex-1 flex gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Conversation List */}
        <Card className={`w-full md:w-80 shrink-0 flex flex-col ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            {l('title')}
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {conversations.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">{l('noConv')}</div>
            )}
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full p-3 text-left hover:bg-accent/50 transition-colors ${activeConvId === conv.id ? 'bg-accent' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {conv.other_profile?.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm truncate">{conv.other_profile?.display_name || '...'}</span>
                      {(conv.unread_count ?? 0) > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {conv.job_title && <div className="text-xs text-primary truncate">📋 {conv.job_title}</div>}
                    {conv.last_message && <div className="text-xs text-muted-foreground truncate">{conv.last_message}</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className={`flex-1 flex flex-col ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
          {activeConvId && activeConv ? (
            <>
              <div className="p-4 border-b flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveConvId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {activeConv.other_profile?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{activeConv.other_profile?.display_name}</div>
                  {activeConv.job_title && <div className="text-xs text-muted-foreground">📋 {activeConv.job_title}</div>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        msg.sender_id === user.id
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                      <div className={`text-[10px] mt-1 ${msg.sender_id === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t flex gap-2">
                <Input
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder={l('placeholder')}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                />
                <Button size="icon" onClick={sendMessage} disabled={sending || !newMsg.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>{language === 'en' ? 'Select a conversation' : language === 'th' ? 'เลือกการสนทนา' : 'ເລືອກການສົນທະນາ'}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default ChatPage;
