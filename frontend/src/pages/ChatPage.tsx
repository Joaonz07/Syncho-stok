import { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';

export default function ChatPage() {
  const { messages, connected, loading, sendMessage } = useChat();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
  };

  return (
    <div className="h-full flex flex-col" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
        <p className="text-gray-500 mt-1 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`}
          />
          {connected ? 'Conectado' : 'Desconectado'}
        </p>
      </div>

      <div className="card flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-400 py-16">
              Nenhuma mensagem ainda. Diga olá! 👋
            </p>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-xs font-semibold text-primary-600 mb-0.5">
                        {msg.senderName}
                      </p>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="border-t border-gray-200 p-4 flex gap-3 items-center"
        >
          <input
            className="input flex-1"
            placeholder="Digite uma mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!connected}
          />
          <button
            type="submit"
            className="btn-primary px-6"
            disabled={!connected || !text.trim()}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
