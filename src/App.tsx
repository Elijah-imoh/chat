import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Users, 
  Copy, 
  Plus, 
  LogIn, 
  MessageSquare, 
  Sparkles, 
  ChevronRight,
  Loader2,
  Check,
  User as UserIcon,
  Clock,
  Wand2,
  FileText,
  Bot
} from 'lucide-react';
import { cn } from './lib/utils';
import { User, Message, RoomState, Tone } from './types';
import * as aiService from './services/ai';

const socket: Socket = io();

export default function App() {
  const [view, setView] = useState<'home' | 'chat'>('home');
  const [roomKey, setRoomKey] = useState('');
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    socket.on('room-state', (state: RoomState) => {
      setUsers(state.users);
      setMessages(state.messages);
    });

    socket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      updateSmartReplies([...messages, message]);
    });

    socket.on('user-joined', (user: { id: string, name: string }) => {
      setUsers(prev => [...prev, { ...user, isTyping: false }]);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: `${user.name} joined the room`,
        userName: 'System',
        userId: 'system',
        timestamp: new Date().toISOString(),
        type: 'system'
      }]);
    });

    socket.on('user-left', (user: { id: string, name: string }) => {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: `${user.name} left the room`,
        userName: 'System',
        userId: 'system',
        timestamp: new Date().toISOString(),
        type: 'system'
      }]);
    });

    socket.on('user-typing', ({ userName, isTyping }: { userName: string, isTyping: boolean }) => {
      setTypingUsers(prev => {
        if (isTyping) {
          return prev.includes(userName) ? prev : [...prev, userName];
        } else {
          return prev.filter(name => name !== userName);
        }
      });
    });

    return () => {
      socket.off('room-state');
      socket.off('new-message');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('user-typing');
    };
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const updateSmartReplies = async (currentMessages: Message[]) => {
    const textOnly = currentMessages
      .filter(m => m.type === 'chat')
      .slice(-5)
      .map(m => `${m.userName}: ${m.text}`);
    
    if (textOnly.length > 0) {
      const replies = await aiService.getSmartReplies(textOnly);
      setSmartReplies(replies);
    }
  };

  const handleCreateRoom = () => {
    const key = Math.random().toString(36).substring(2, 5).toUpperCase() + '-' + 
                Math.random().toString(36).substring(2, 5).toUpperCase();
    setRoomKey(key);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomKey && userName) {
      socket.emit('join-room', { roomKey, userName });
      setView('chat');
    }
  };

  const handleSendMessage = (textOverride?: string) => {
    const text = textOverride || inputText;
    if (text.trim()) {
      socket.emit('send-message', { roomKey, text, userName });
      setInputText('');
      handleTyping(false);
    }
  };

  const handleTyping = (typing: boolean) => {
    if (isTyping !== typing) {
      setIsTyping(typing);
      socket.emit('typing', { roomKey, isTyping: typing });
    }

    if (typing) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 3000);
    }
  };

  const handleRewrite = async (tone: Tone) => {
    if (!inputText) return;
    setIsAiLoading(true);
    const rewritten = await aiService.rewriteMessage(inputText, tone);
    setInputText(rewritten);
    setIsAiLoading(false);
  };

  const handleSummarize = async () => {
    setIsAiLoading(true);
    const chatText = messages
      .filter(m => m.type === 'chat')
      .map(m => `${m.userName}: ${m.text}`);
    const result = await aiService.summarizeChat(chatText);
    setSummary(result);
    setIsAiLoading(false);
  };

  const handleAssistantAsk = async () => {
    if (!assistantQuery) return;
    setIsAiLoading(true);
    const chatText = messages
      .filter(m => m.type === 'chat')
      .map(m => `${m.userName}: ${m.text}`);
    const result = await aiService.askAssistant(assistantQuery, chatText);
    setAssistantResponse(result);
    setIsAiLoading(false);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(roomKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (view === 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl border border-border shadow-2xl"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
              <MessageSquare size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">MeetChat</h1>
            <p className="text-muted-foreground">Real-time messaging with AI assistance</p>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  placeholder="Your Display Name"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-bg border border-border rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div className="relative">
                <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  placeholder="Meeting Key (ABC-123)"
                  required
                  value={roomKey}
                  onChange={(e) => setRoomKey(e.target.value.toUpperCase())}
                  className="w-full bg-bg border border-border rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCreateRoom}
                className="flex-1 flex items-center justify-center gap-2 bg-bg border border-border hover:bg-border/50 py-4 rounded-2xl font-medium transition-all"
              >
                <Plus size={20} />
                New Room
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 py-4 rounded-2xl font-medium transition-all shadow-lg shadow-primary/20"
              >
                Join Room
                <ChevronRight size={20} />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg text-white overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="font-semibold leading-none">Room: {roomKey}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">{users.length} online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={copyKey}
            className="p-2 hover:bg-border rounded-lg transition-colors relative group"
          >
            {copySuccess ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Copy Key
            </span>
          </button>
          <button 
            onClick={handleSummarize}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-all"
          >
            <FileText size={16} />
            Summarize
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex flex-col",
                msg.userId === socket.id ? "items-end" : "items-start",
                msg.type === 'system' && "items-center"
              )}
            >
              {msg.type === 'system' ? (
                <span className="text-xs bg-border/30 px-3 py-1 rounded-full text-muted-foreground">
                  {msg.text}
                </span>
              ) : (
                <div className={cn(
                  "max-w-[80%] space-y-1",
                  msg.userId === socket.id ? "items-end" : "items-start"
                )}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {msg.userId === socket.id ? 'You' : msg.userName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    msg.userId === socket.id 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-card border border-border rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {typingUsers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-muted-foreground italic"
          >
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* AI Assistant Overlay */}
      <AnimatePresence>
        {showAiAssistant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 right-6 w-80 bg-card border border-border rounded-2xl shadow-2xl p-4 space-y-4 z-20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Bot size={18} />
                <span className="font-semibold text-sm">AI Assistant</span>
              </div>
              <button onClick={() => setShowAiAssistant(false)} className="text-muted-foreground hover:text-white">
                <Plus size={18} className="rotate-45" />
              </button>
            </div>
            
            <div className="space-y-2">
              <input 
                type="text"
                placeholder="Ask anything about the chat..."
                value={assistantQuery}
                onChange={(e) => setAssistantQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAssistantAsk()}
                className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button 
                onClick={handleAssistantAsk}
                disabled={isAiLoading}
                className="w-full bg-primary text-primary-foreground py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2"
              >
                {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Ask AI
              </button>
            </div>

            {assistantResponse && (
              <div className="bg-bg/50 rounded-xl p-3 text-xs leading-relaxed border border-border/50 max-h-40 overflow-y-auto">
                {assistantResponse}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Modal */}
      <AnimatePresence>
        {summary && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border rounded-3xl p-8 max-w-lg w-full space-y-6"
            >
              <div className="flex items-center gap-3 text-primary">
                <FileText size={24} />
                <h3 className="text-xl font-bold">Chat Summary</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">{summary}</p>
              <button 
                onClick={() => setSummary(null)}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-medium"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer / Input Area */}
      <footer className="p-6 border-t border-border bg-card/30 space-y-4">
        {/* Smart Replies */}
        {smartReplies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {smartReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(reply)}
                className="px-3 py-1.5 bg-border/50 hover:bg-border rounded-full text-xs transition-all border border-border/50"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-4">
          <div className="flex-1 bg-bg border border-border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <textarea
              rows={1}
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                handleTyping(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full bg-transparent border-none resize-none px-3 py-2 focus:outline-none text-sm max-h-32 scrollbar-hide"
            />
            <div className="flex items-center justify-between px-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleRewrite('formal')}
                  className="p-1.5 hover:bg-border rounded-lg text-muted-foreground hover:text-white transition-all group relative"
                >
                  <Clock size={16} />
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Formal</span>
                </button>
                <button 
                  onClick={() => handleRewrite('casual')}
                  className="p-1.5 hover:bg-border rounded-lg text-muted-foreground hover:text-white transition-all group relative"
                >
                  <Wand2 size={16} />
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Casual</span>
                </button>
                <button 
                  onClick={() => handleRewrite('friendly')}
                  className="p-1.5 hover:bg-border rounded-lg text-muted-foreground hover:text-white transition-all group relative"
                >
                  <Sparkles size={16} />
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Friendly</span>
                </button>
              </div>
              <button 
                onClick={() => setShowAiAssistant(!showAiAssistant)}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  showAiAssistant ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white hover:bg-border"
                )}
              >
                <Bot size={18} />
              </button>
            </div>
          </div>
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
          >
            <Send size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
