import React, { useEffect, useMemo, useRef, useState } from 'react';
import { auth, db, rtdb } from './firebase';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { onValue, ref } from 'firebase/database';
import './Messenger.css';

function threadIdFor(a, b) {
  return [a, b].sort().join('_');
}

export default function Messenger({ usuario, onBack }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusMap, setStatusMap] = useState({});

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);

  const currentUid = auth.currentUser?.uid || usuario?.uid;

  useEffect(() => {
    // Load approved users list (excluding current).
    const q = query(collection(db, 'usuarios'), where('aprobado', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== currentUid);
      setUsers(list);
    });
    return () => unsub();
  }, [currentUid]);

  useEffect(() => {
    if (!rtdb) return undefined;
    const statusesRef = ref(rtdb, '/status');
    const unsub = onValue(statusesRef, (snap) => {
      setStatusMap(snap.val() || {});
    });
    return () => unsub();
  }, []);

  const filteredUsers = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => (u.nombre || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s));
  }, [search, users]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!currentUid || !selected?.id) {
      setMessages([]);
      return undefined;
    }

    const threadId = threadIdFor(currentUid, selected.id);
    const q = query(collection(db, 'threads', threadId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentUid, selected]);

  const send = async () => {
    if (!currentUid || !selected?.id) return;
    const text = draft.trim();
    if (!text) return;

    const threadId = threadIdFor(currentUid, selected.id);
    const threadRef = doc(db, 'threads', threadId);
    const msgRef = collection(db, 'threads', threadId, 'messages');

    const senderName = usuario?.nombre || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Usuario';

    await setDoc(threadRef, {
      participants: [currentUid, selected.id],
      updatedAt: serverTimestamp(),
      lastMessage: {
        text,
        senderId: currentUid,
        createdAt: serverTimestamp(),
      },
    }, { merge: true });

    await addDoc(msgRef, {
      text,
      senderId: currentUid,
      senderName,
      createdAt: serverTimestamp(),
    });

    setDraft('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const selectedStatus = selected?.id ? statusMap[selected.id]?.state : null;
  const selectedOnline = selectedStatus === 'online';

  return (
    <div className="fju-messenger">
      <div className="fju-msTop">
        <div className="fju-msTopInner">
          <div className="fju-msTitle">Mensajes</div>
          <button className="fju-msBack" onClick={onBack} type="button">Volver</button>
        </div>
      </div>

      <div className="fju-msShell">
        <div className="fju-msPanel">
          <div className="fju-msSearch">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar persona..."
            />
          </div>
          <div className="fju-msList">
            {filteredUsers.length === 0 && (
              <div className="fju-msEmpty">No hay usuarios.</div>
            )}
            {filteredUsers.map((u) => {
              const state = statusMap[u.id]?.state;
              const online = state === 'online';
              const active = selected?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`fju-msUser ${active ? 'fju-msUserActive' : ''}`}
                  onClick={() => setSelected(u)}
                >
                  <div className="fju-msAvatar">{(u.nombre || '?').charAt(0).toUpperCase()}</div>
                  <div className="fju-msMeta">
                    <p className="fju-msName">{u.nombre || 'Sin nombre'}</p>
                    <p className="fju-msRole">{u.rol || 'miembro'}</p>
                  </div>
                  <div className={`fju-msDot ${online ? 'fju-msDotOn' : ''}`} title={online ? 'En linea' : 'Desconectado'} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="fju-msPanel fju-msChat">
          <div className="fju-msChatHead">
            <div>
              <h3>{selected ? selected.nombre : 'Selecciona un usuario'}</h3>
              {selected && (
                <div style={{ color: 'rgba(12,18,34,0.55)', fontSize: 12, fontFamily: 'Inter, system-ui' }}>
                  {selectedOnline ? 'En linea' : 'Desconectado'}
                </div>
              )}
            </div>
          </div>

          {!selected ? (
            <div className="fju-msEmpty">Elige a alguien de la lista para chatear.</div>
          ) : (
            <>
              <div className="fju-msChatBody">
                {messages.length === 0 && (
                  <div className="fju-msEmpty">Aun no hay mensajes.</div>
                )}
                {messages.map((m) => {
                  const me = m.senderId === currentUid;
                  return (
                    <div
                      key={m.id}
                      className={`fju-msBubbleRow ${me ? 'fju-msBubbleRowMe' : 'fju-msBubbleRowOther'}`}
                    >
                      <div className={`fju-msBubble ${me ? 'fju-msBubbleMe' : 'fju-msBubbleOther'}`}>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="fju-msComposer">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={`Mensaje a ${selected.nombre || '...'}`}
                />
                <button className="fju-msSend" onClick={send} type="button">Enviar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

