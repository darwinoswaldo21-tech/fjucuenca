import React, { useState, useRef, useEffect } from 'react';
import useHelpChat from './hooks/useHelpChat';
import { HELP_CATEGORIES } from './helpConfig';

export default function HelpChatScreen({ currentUser, category, onBack }) {
  // El hook actual usa una sola coleccion "help_chat" y no implementa soporte real de categorias/asignacion.
  // Esta pantalla se alinea al contrato real del hook: { messages, sendMessage } y mensajes { text, user }.
  const { messages, sendMessage } = useHelpChat();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const cat = HELP_CATEGORIES.find((c) => c.id === category);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const nombre =
      currentUser?.nombre ||
      currentUser?.displayName ||
      currentUser?.email?.split('@')[0] ||
      'Anon';
    await sendMessage(text, nombre);
    setText('');
  };

  if (messages === null) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>
        Conectando con un líder...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #eee',
        background: cat?.color + '15',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}
        >
          ←
        </button>
        <span style={{ fontSize: 24 }}>{cat?.icon}</span>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{cat?.label}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
            Chat de ayuda general
          </p>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 12px',
        display: 'flex', flexDirection: 'column', gap: 8
      }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, marginTop: 40 }}>
            Sé el primero en escribir. Estamos aquí para ayudarte 🙏
          </p>
        )}
        {messages.map((msg) => {
          const nombre =
            currentUser?.nombre ||
            currentUser?.displayName ||
            currentUser?.email?.split('@')[0] ||
            'Anon';
          const esMio = msg.user === nombre;

          return (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: esMio ? 'flex-end' : 'flex-start'
            }}>
              <div style={{ maxWidth: '75%' }}>
                {!esMio && (
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888', fontWeight: 600 }}>
                    {msg.user || 'Anon'}
                  </p>
                )}
                <div style={{
                  maxWidth: '75%',
                  padding: '8px 14px',
                  borderRadius: esMio
                    ? '18px 18px 4px 18px'
                    : '18px 18px 18px 4px',
                  background: esMio ? cat?.color : '#f0f0f0',
                  color: esMio ? '#fff' : '#222',
                  fontSize: 14,
                }}>
                  <p style={{ margin: 0 }}>{msg.text}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #eee',
        display: 'flex',
        gap: 8,
      }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escribe tu mensaje..."
          style={{
            flex: 1, padding: '10px 14px',
            borderRadius: 22, border: '1px solid #ddd',
            fontSize: 14, outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: '0 18px', borderRadius: 22,
            background: cat?.color || '#5C9E7A',
            color: '#fff', border: 'none',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
