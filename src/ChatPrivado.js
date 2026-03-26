import React, { useEffect, useRef, useState } from 'react';
import { auth, db } from './firebase';
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

function ChatPrivado({ usuario, onBack }) {
  const [contactos, setContactos] = useState([]);
  const [contacto, setContacto] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const cargar = async () => {
      const current = auth.currentUser;
      if (!current) return;
      const snap = await getDocs(collection(db, 'usuarios'));
      setContactos(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== current.uid)
      );
    };
    cargar();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  useEffect(() => {
    const current = auth.currentUser;
    if (!current || !contacto) {
      setMensajes([]);
      return undefined;
    }

    const chatId = [current.uid, contacto.id].sort().join('_');
    const q = query(
      collection(db, 'chatprivado'),
      where('chatId', '==', chatId),
      orderBy('fecha', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setMensajes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [contacto]);

  const enviar = async () => {
    const current = auth.currentUser;
    if (!current || !contacto || !nuevo.trim()) return;

    const chatId = [current.uid, contacto.id].sort().join('_');
    const nombre =
      usuario?.nombre ||
      current.displayName ||
      current.email?.split('@')[0] ||
      'Usuario';

    await addDoc(collection(db, 'chatprivado'), {
      chatId,
      texto: nuevo.trim(),
      autor: nombre,
      autorId: current.uid,
      fecha: new Date().toISOString(),
    });

    setNuevo('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7eef2',
        fontFamily: 'system-ui',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: '#9d174d',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/fondo1.jpg"
            alt="FJU"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid white',
            }}
          />
          <div>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '18px' }}>
              Chat Privado
            </span>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '12px' }}>
              {contacto ? `Hablando con ${contacto.nombre || 'Sin nombre'}` : 'Elige un contacto'}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Volver
        </button>
      </div>

      {!contacto && (
        <div style={{ maxWidth: '700px', width: '100%', margin: '0 auto', padding: '20px' }}>
          <h3 style={{ color: '#9d174d', margin: '0 0 12px' }}>Selecciona un contacto</h3>
          {contactos.length === 0 && (
            <p style={{ color: '#888', margin: 0 }}>
              No hay contactos para mostrar.
            </p>
          )}
          {contactos.map((u) => (
            <div
              key={u.id}
              onClick={() => setContacto(u)}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#b1125a,#e04386)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '18px',
                }}
              >
                {(u.nombre || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: '700', color: '#9d174d' }}>
                  {u.nombre || 'Sin nombre'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>{u.rol}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {contacto && (
        <>
          <div
            style={{
              background: 'white',
              padding: '12px 24px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              onClick={() => setContacto(null)}
              style={{
                background: '#9d174d',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Atras
            </button>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#b1125a,#e04386)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
              }}
            >
              {(contacto.nombre || '?').charAt(0).toUpperCase()}
            </div>
            <p style={{ margin: 0, fontWeight: '700', color: '#9d174d' }}>
              {contacto.nombre || 'Sin nombre'}
            </p>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              maxWidth: '700px',
              width: '100%',
              margin: '0 auto',
              boxSizing: 'border-box',
            }}
          >
            {mensajes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                <p style={{ margin: 0 }}>Aun no hay mensajes.</p>
              </div>
            )}
            {mensajes.map((msg) => {
              const esMio = msg.autorId === auth.currentUser?.uid;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: esMio ? 'flex-end' : 'flex-start',
                    marginBottom: '12px',
                  }}
                >
                  {!esMio && (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg,#b1125a,#e04386)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '13px',
                        marginRight: '8px',
                        flexShrink: 0,
                      }}
                    >
                      {(msg.autor || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ maxWidth: '70%' }}>
                    {!esMio && (
                      <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#888', fontWeight: '600' }}>
                        {msg.autor}
                      </p>
                    )}
                    <div
                      style={{
                        background: esMio ? '#9d174d' : 'white',
                        color: esMio ? 'white' : '#333',
                        padding: '10px 16px',
                        borderRadius: esMio ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        fontSize: '15px',
                      }}
                    >
                      {msg.texto}
                    </div>
                    {msg.fecha && (
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: '11px',
                          color: '#aaa',
                          textAlign: esMio ? 'right' : 'left',
                        }}
                      >
                        {new Date(msg.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{ background: 'white', padding: '16px', boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <textarea
                placeholder="Escribe un mensaje... (Enter para enviar)"
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                onKeyDown={handleKey}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '2px solid #eee',
                  fontSize: '15px',
                  outline: 'none',
                  resize: 'none',
                  maxHeight: '100px',
                  fontFamily: 'system-ui',
                }}
              />
              <button
                onClick={enviar}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg,#b1125a,#e04386)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '700',
                }}
              >
                Enviar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatPrivado;

