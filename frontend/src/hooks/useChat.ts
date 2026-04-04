import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ChatMessage } from '@shared/types';
import { chatApi } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // Load historical messages
  useEffect(() => {
    chatApi
      .messages()
      .then((res) => {
        // API returns newest-first; reverse for chronological display
        setMessages([...res.data.data].reverse());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Connect Socket.io
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:3001', {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('chat:message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = useCallback((content: string) => {
    socketRef.current?.emit('chat:send', content);
  }, []);

  return { messages, connected, loading, sendMessage };
}
