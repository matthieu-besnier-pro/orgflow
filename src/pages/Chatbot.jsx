import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Bot, Sparkles, Paperclip, X, FileText, Plus, MessageSquareText, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import ChatSuggestionsPanel from '@/components/ChatSuggestionsPanel';
import { useToast } from '@/components/ui/use-toast';
import { useCompany } from '@/lib/CompanyContext';
import { logCreditUsage } from '@/lib/creditTracking';

export default function Chatbot() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef();
  const fileInputRef = useRef();
  const unsubscribeRef = useRef(null);
  const { toast } = useToast();
  const { selectedCompany } = useCompany();

  useEffect(() => {
    loadSessions();
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: 'hr_assistant' });
      setSessions(list);
      if (list.length > 0) {
        await selectConversation(list[0]);
      } else {
        await createNewSession();
      }
    } catch {
      await createNewSession();
    }
  };

  const selectConversation = async (conv) => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setConversation(conv);
    setLoading(true);
    setMessages([]);
    setSending(false);

    try {
      const full = await base44.agents.getConversation(conv.id);
      setMessages(full.messages || []);
    } catch {}

    const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
      setSending(false);
    });
    unsubscribeRef.current = unsubscribe;
    setLoading(false);
  };

  const createNewSession = async () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setMessages([]);
    setSending(false);
    setLoading(true);

    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'hr_assistant',
        metadata: { name: 'Nouvelle conversation', description: 'Assistant RH' }
      });
      setConversation(conv);
      setSessions(prev => [conv, ...prev]);

      const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
        setSending(false);
      });
      unsubscribeRef.current = unsubscribe;
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de démarrer une conversation.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const deleteSession = async (e, conv) => {
    e.stopPropagation();
    try {
      // Note: the platform doesn't expose a deleteConversation method,
      // so we filter it out locally. The conversation remains on the server.
      setSessions(prev => prev.filter(s => s.id !== conv.id));
      if (conversation?.id === conv.id) {
        if (sessions.length > 1) {
          const remaining = sessions.filter(s => s.id !== conv.id);
          if (remaining.length > 0) {
            await selectConversation(remaining[0]);
          } else {
            await createNewSession();
          }
        } else {
          await createNewSession();
        }
      }
      toast({ title: 'Conversation supprimée', duration: 2000 });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const sendMessage = async (text) => {
    if ((!text.trim() && attachedFiles.length === 0) || !conversation || sending) return;
    setSending(true);
    const file_urls = attachedFiles.map(f => f.url);
    const content = text.trim() || (file_urls.length ? `J'ai partagé ${file_urls.length} fichier(s). Peux-tu analyser ce contenu pour m'aider (nouvelle structure, ajout en masse, etc.) ?` : '');
    setInput('');
    setAttachedFiles([]);
    await base44.agents.addMessage(conversation, { role: 'user', content, file_urls: file_urls.length ? file_urls : undefined });
    logCreditUsage({
      companyId: selectedCompany?.id,
      companyName: selectedCompany?.name,
      service: 'agent_message',
      creditsEstimated: 3,
      description: content.slice(0, 100),
    });

    // Mettre à jour le titre si c'est le premier message
    if (messages.length === 0 && text.trim()) {
      const title = text.trim().slice(0, 45) + (text.trim().length > 45 ? '…' : '');
      base44.agents.updateConversation(conversation.id, { metadata: { name: title, description: 'Assistant RH' } }).catch(() => {});
      setSessions(prev => prev.map(s => s.id === conversation.id ? { ...s, metadata: { ...s.metadata, name: title } } : s));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setAttachedFiles(prev => [...prev, { url: file_url, name: file.name }]);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
    setUploading(false);
    e.target.value = '';
  };

  const getSessionTitle = (s) => s.metadata?.name || s.name || 'Conversation';
  const getSessionDate = (s) => {
    const d = new Date(s.updated_date || s.created_date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-full bg-canvas">
      {/* Sidebar - Conversation history */}
      <div className={`flex flex-col bg-white border-r border-border transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden flex-shrink-0`}>
        <div className="p-3 border-b border-border">
          <Button onClick={createNewSession} className="w-full gap-2 text-sm" variant="outline">
            <Plus className="w-4 h-4" />
            Nouvelle conversation
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune conversation</p>
          ) : (
            sessions.map((s) => {
              const active = conversation?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => selectConversation(s)}
                  className={`group flex items-start gap-2 p-2.5 rounded-xl cursor-pointer transition-colors ${
                    active ? 'bg-lavender text-foreground' : 'hover:bg-secondary text-muted-foreground'
                  }`}
                >
                  <MessageSquareText className={`w-4 h-4 flex-shrink-0 mt-0.5 ${active ? 'text-primary' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${active ? 'font-medium text-foreground' : ''}`}>
                      {getSessionTitle(s)}
                    </p>
                    <p className="text-xs text-muted-foreground">{getSessionDate(s)}</p>
                  </div>
                  <button
                    onClick={(e) => deleteSession(e, s)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0 mt-0.5"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground"
              title={sidebarOpen ? 'Masquer l\'historique' : 'Afficher l\'historique'}
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-semibold text-foreground">Assistant RH</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-xs text-muted-foreground">En ligne · Recherche & Modifications</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <ChatSuggestionsPanel onSelect={sendMessage} />
          ) : (
            messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-border shadow-sm">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 bg-white border-t border-border">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 py-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-foreground max-w-[180px] truncate">{f.name}</span>
                  <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 items-end">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg,.pdf,.docx"
            />
            <Button
              variant="outline"
              className="h-11 w-11 p-0 rounded-xl flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
              title="Joindre un fichier (Excel, capture d'écran, PDF...)"
            >
              {uploading ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question, donnez une instruction, ou joignez un fichier..."
                rows={1}
                className="w-full px-4 py-3 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none bg-secondary"
                style={{ maxHeight: '120px', minHeight: '44px' }}
              />
            </div>
            <Button
              className="h-11 w-11 p-0 rounded-xl flex-shrink-0"
              onClick={() => sendMessage(input)}
              disabled={sending || (!input.trim() && attachedFiles.length === 0)}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Entrée pour envoyer · Shift+Entrée pour nouvelle ligne · 📎 Joindre Excel, capture d'écran, PDF...</p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isUser
            ? 'bg-primary text-white rounded-tr-sm'
            : 'bg-white border border-border text-foreground rounded-tl-sm'
        }`}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
            {message.content || ''}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}