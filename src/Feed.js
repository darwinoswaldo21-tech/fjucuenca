import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, getDocs, onSnapshot, orderBy, query, where, doc, deleteDoc, limit, startAfter, updateDoc, serverTimestamp } from 'firebase/firestore';
import FeedComments from './FeedComments';
import './FeedPro.css';

function Feed({ usuario, onLogout, onAdmin, onHelp, onMedias, onGroups, onChat, onChatPrivado }) {
  // Feed: 20 posts mas recientes en tiempo real + "Cargar mas" para posts antiguos.
  const PAGE_SIZE = 20;
  const [recentPosts, setRecentPosts] = useState([]);
  const [olderPosts, setOlderPosts] = useState([]);
  const [cursorDoc, setCursorDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedMoreOnce, setLoadedMoreOnce] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);
  const [vista, setVista] = useState('feed');
  const [usuarios, setUsuarios] = useState([]);
  const [contacto, setContacto] = useState(null);
  const [mensajesChat, setMensajesChat] = useState([]);
  const [mensajesPrivado, setMensajesPrivado] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState('');
  const bottomRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState('new'); // 'new' | 'old'
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [focusPostId, setFocusPostId] = useState(null);

  // Si existen handlers, el navbar navega a pantallas separadas y no necesitamos listeners inline.
  const inlineChat = !onChat;
  const inlinePrivado = !onChatPrivado;

  const mostrarNotif = (msg, tipo) => {
    setNotif({msg, tipo});
    setTimeout(() => setNotif(null), 4000);
  };

  useEffect(() => {
    if (!inlinePrivado) return;

    const cargar = async () => {
      const snap = await getDocs(collection(db, 'usuarios'));
      setUsuarios(snap.docs.map(d => ({id: d.id, ...d.data()})).filter(u => u.id !== auth.currentUser.uid));
    };

    cargar();
  }, [inlinePrivado]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('fecha', 'desc'), limit(PAGE_SIZE));
    const unsub = onSnapshot(q, (snap) => {
      setRecentPosts(snap.docs.map(d => ({id: d.id, ...d.data()})));

      const last = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
      if (!loadedMoreOnce) setCursorDoc(last);
      setHasMore(snap.docs.length === PAGE_SIZE);
    });
    return () => unsub();
  }, [PAGE_SIZE, loadedMoreOnce]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;

    const q = query(collection(db, 'notifications', uid, 'items'), orderBy('createdAt', 'desc'), limit(40));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotifs(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    });
    return () => unsub();
  }, []);

  const markNotifRead = async (n) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !n?.id) return;
    if (n.read) return;
    try {
      await updateDoc(doc(db, 'notifications', uid, 'items', n.id), {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (e) {
      // best-effort
    }
  };

  const markAllRead = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unread = notifs.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(
        unread.map((n) => updateDoc(doc(db, 'notifications', uid, 'items', n.id), { read: true, readAt: serverTimestamp() }))
      );
    } catch (e) {
      // best-effort
    }
  };

  const openNotif = () => {
    setNotifOpen((v) => !v);
    setNotifTab('new');
  };

  const goToPost = (postId) => {
    if (!postId) return;
    setVista('feed');
    setFocusPostId(postId);
    setNotifOpen(false);

    setTimeout(() => {
      const el = document.getElementById(`post-${postId}`);
      if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => setFocusPostId(null), 2500);
    }, 120);
  };

  const fmtNotifTime = (n) => {
    try {
      const d = n?.createdAt?.toDate ? n.createdAt.toDate() : null;
      if (!d) return '';
      return d.toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const cargarMas = async () => {
    if (!cursorDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const q = query(collection(db, 'posts'), orderBy('fecha', 'desc'), startAfter(cursorDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setOlderPosts(prev => [...prev, ...list]);

      const last = snap.docs.length ? snap.docs[snap.docs.length - 1] : cursorDoc;
      setCursorDoc(last);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadedMoreOnce(true);
    } catch (e) {
      mostrarNotif('No se pudo cargar mas publicaciones', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!inlineChat) return;
    const q = query(collection(db, 'chat'), orderBy('fecha', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMensajesChat(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, [inlineChat]);

  useEffect(() => {
    if (!inlinePrivado || !contacto) return;
    const chatId = [auth.currentUser.uid, contacto.id].sort().join('_');
    const q = query(collection(db, 'chatprivado'), where('chatId', '==', chatId), orderBy('fecha', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMensajesPrivado(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, [contacto, inlinePrivado]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior:'smooth'});
  }, [mensajesChat, mensajesPrivado]);

  const publicar = async () => {
    if (!nuevo.trim()) {
      mostrarNotif('Escribe algo primero', 'error');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        texto: nuevo,
        autor: usuario.nombre,
        autorId: auth.currentUser.uid,
        fecha: new Date().toISOString(),
        aprobado: usuario.rol === 'admin' || usuario.rol === 'moderador',
        likes: 0
      });
      setNuevo('');
      if (usuario.rol === 'admin' || usuario.rol === 'moderador') {
        mostrarNotif('Post publicado!', 'exito');
      } else {
        mostrarNotif('Post enviado! El moderador lo revisara pronto.', 'exito');
      }
    } catch (err) {
      mostrarNotif('Error al publicar', 'error');
    }
    setLoading(false);
  };

  const borrarPost = async (post) => {
    if (!window.confirm('¿Seguro que quieres borrar esta publicación?')) return;
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      mostrarNotif('Publicación borrada', 'exito');
    } catch (e) {
      mostrarNotif('Error al borrar', 'error');
    }
  };

  const enviarChat = async () => {
    if (!nuevoMsg.trim()) return;
    try {
      await addDoc(collection(db, 'chat'), {
        texto: nuevoMsg,
        autor: usuario.nombre,
        autorId: auth.currentUser.uid,
        fecha: new Date().toISOString()
      });
      setNuevoMsg('');
    } catch (err) {
      console.log(err);
    }
  };

  const enviarPrivado = async () => {
    if (!nuevoMsg.trim() || !contacto) return;
    const chatId = [auth.currentUser.uid, contacto.id].sort().join('_');
    try {
      await addDoc(collection(db, 'chatprivado'), {
        chatId,
        texto: nuevoMsg,
        autor: usuario.nombre,
        autorId: auth.currentUser.uid,
        fecha: new Date().toISOString()
      });
      setNuevoMsg('');
    } catch (err) {
      console.log(err);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (vista === 'chat') enviarChat();
      if (vista === 'privado' && contacto) enviarPrivado();
    }
  };

  const navBtn = (v, label) => (
    <button
      onClick={() => setVista(v)}
      className={`fju-chip ${vista === v ? 'fju-chipActive' : ''}`}
      type="button"
    >
      {label}
    </button>
  );

  const puedeBorar = (post) => {
    return usuario.uid === post.autorId || usuario.rol === 'admin';
  };

  const posts = (() => {
    // Merge (recent first) + older, avoid duplicates when realtime updates happen.
    const out = [];
    const seen = new Set();
    for (const p of [...recentPosts, ...olderPosts]) {
      if (!p || !p.id) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  })();

  const visiblePosts = posts.filter(p => p.aprobado);

  return (
    <div className="fju-feed">
      {notif && (
        <div className={`fju-toast ${notif.tipo === 'exito' ? 'fju-toastOk' : 'fju-toastErr'}`}>
          {notif.tipo==='exito'?'OK: ':'ERROR: '}{notif.msg}
        </div>
      )}

      {/* Navbar */}
      <div className="fju-topbar">
        <div className="fju-topbarInner">
          <div className="fju-brand">
            <img src="/fondo1.jpg" alt="FJU" />
            <div>
              <div className="fju-brandTitle">FJU Cuenca</div>
              <div className="fju-brandSub">Feed de la comunidad</div>
            </div>
          </div>
          <div className="fju-nav">
          {navBtn('feed', 'Inicio')}
          {onChat ? (
            <button onClick={onChat} className="fju-chip" type="button">
              Chat
            </button>
          ) : (
            navBtn('chat', 'Chat')
          )}
          {onChatPrivado ? (
            <button onClick={onChatPrivado} className="fju-chip" type="button">
              Mensajes
            </button>
          ) : (
            navBtn('privado', 'Privado')
          )}
          <button onClick={onHelp} className="fju-chip fju-chipPrimary" type="button">
            🙏 Help
          </button>
                    <button onClick={onMedias} className="fju-chip fju-chipPrimary" type="button">Medios</button>
          <button onClick={onGroups} className="fju-chip fju-chipPrimary" type="button">Grupos</button>

          {/* Notificaciones (in-app) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={openNotif}
              className={`fju-chip ${notifOpen ? 'fju-chipActive' : ''}`}
              type="button"
              style={{ position: 'relative', padding: '8px 12px' }}
              aria-label="Notificaciones"
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    background: '#dc2626',
                    color: 'white',
                    borderRadius: 999,
                    padding: '2px 6px',
                    fontSize: 11,
                    fontWeight: 800,
                    lineHeight: 1,
                    border: '2px solid white',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 10px)',
                  width: 340,
                  maxWidth: '85vw',
                  background: 'white',
                  borderRadius: 18,
                  boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  zIndex: 200,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: 900, color: '#9d174d' }}>Notificaciones</div>
                  <button onClick={markAllRead} className="fju-chip" type="button">Marcar leido</button>
                </div>

                <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderBottom: '1px solid #f3f3f3' }}>
                  <button onClick={() => setNotifTab('new')} className={`fju-chip ${notifTab === 'new' ? 'fju-chipActive' : ''}`} type="button">Nuevas</button>
                  <button onClick={() => setNotifTab('old')} className={`fju-chip ${notifTab === 'old' ? 'fju-chipActive' : ''}`} type="button">Anteriores</button>
                </div>

                <div style={{ maxHeight: 380, overflowY: 'auto', padding: 10, background: '#fafafa' }}>
                  {notifs.filter((n) => (notifTab === 'new' ? !n.read : !!n.read)).length === 0 && (
                    <div style={{ color: '#777', fontSize: 13, padding: 12, textAlign: 'center' }}>
                      No hay notificaciones.
                    </div>
                  )}
                  {notifs
                    .filter((n) => (notifTab === 'new' ? !n.read : !!n.read))
                    .map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotifRead(n);
                          if (n.postId) goToPost(n.postId);
                          else setNotifOpen(false);
                        }}
                        style={{
                          background: 'white',
                          borderRadius: 14,
                          padding: '10px 12px',
                          marginBottom: 8,
                          border: '1px solid rgba(0,0,0,0.06)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                          <div style={{ fontWeight: 900, color: '#9d174d', fontSize: 13.5 }}>
                            {n.title || 'Notificacion'}
                          </div>
                          <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>{fmtNotifTime(n)}</div>
                        </div>
                        {n.body && <div style={{ fontSize: 12.5, color: '#444', marginTop: 4, lineHeight: 1.35 }}>{n.body}</div>}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {onAdmin && (
            <button onClick={onAdmin} className="fju-chip fju-chipAdmin" type="button">
              Admin
            </button>
          )}
          <span className="fju-hello">Hola, {usuario.nombre}</span>
          <button onClick={onLogout} className="fju-chip" type="button">Salir</button>
        </div>
        </div>
      </div>

      {vista === 'feed' && (
        <div className="fju-page">
          {/* Crear post */}
          <div className="fju-card" style={{padding:'16px',marginBottom:'14px'}}>
            <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
              <div className="fju-avatar" style={{flexShrink:0}}>
                {usuario.nombre.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <textarea
                  placeholder="Comparte algo con la comunidad FJU..."
                  value={nuevo}
                  onChange={(e)=>setNuevo(e.target.value)}
                  className="fju-textarea"
                />
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'8px'}}>
                  <span style={{color:'#666',fontSize:'12.5px'}}>Comparte con amor ✝️</span>
                  <button onClick={publicar} disabled={loading} className="fju-cta" type="button">
                    {loading?'Enviando...':'Publicar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts */}
          {visiblePosts.length === 0 && (
            <div style={{textAlign:'center',padding:'40px',color:'#aaa'}}>
              <p style={{fontSize:'48px'}}>✝️</p>
              <p>Aun no hay publicaciones. Se el primero en compartir!</p>
            </div>
          )}
          {visiblePosts.map(post => (
            <div
              key={post.id}
              id={`post-${post.id}`}
              className="fju-card"
              style={{
                padding:'16px',
                marginBottom:'12px',
                outline: focusPostId === post.id ? '3px solid rgba(244,114,182,0.45)' : 'none'
              }}
            >
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                <div className="fju-avatar" style={{width:'40px',height:'40px',borderRadius:'50%'}}>
                  {post.autor.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{margin:0,fontWeight:'700',color:'#9d174d'}}>{post.autor}</p>
                  <p style={{margin:0,fontSize:'12px',color:'#aaa'}}>
                    {new Date(post.fecha).toLocaleDateString('es-EC',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
                {post.tipo === 'foto' && (
                  <span style={{background:'#f7e8f0',color:'#9d174d',fontSize:'11px',padding:'3px 10px',borderRadius:20,fontWeight:600}}>📸 Medios</span>
                )}
                {(post.tipo === 'video' || post.tipo === 'videoDirecto') && (
                  <span style={{background:'#f7e8f0',color:'#9d174d',fontSize:'11px',padding:'3px 10px',borderRadius:20,fontWeight:600}}>🎥 Medios</span>
                )}
                {puedeBorar(post) && (
                  <button
                    onClick={() => borrarPost(post)}
                    style={{marginLeft:'auto',background:'#fee2e2',border:'none',borderRadius:8,padding:'4px 12px',color:'#dc2626',fontSize:12,cursor:'pointer',fontWeight:600}}
                  >
                    🗑 Borrar
                  </button>
                )}
              </div>
              <p style={{margin:0,fontSize:'15px',lineHeight:'1.6',color:'#333'}}>{post.texto}</p>
              {post.imagen && !post.videoId && !post.videoUrl && (
                <img
                  src={post.imagen}
                  alt="foto compartida"
                  style={{width:'100%',borderRadius:12,marginTop:12,maxHeight:400,objectFit:'cover',cursor:'pointer'}}
                  onClick={() => window.open(post.imagen, '_blank')}
                />
              )}
              {post.videoId && (
                <iframe
                  src={`https://www.youtube.com/embed/${post.videoId}`}
                  title={post.texto}
                  style={{width:'100%',height:300,borderRadius:12,marginTop:12,border:'none'}}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
              {post.videoUrl && (
                <video
                  src={post.videoUrl}
                  controls
                  playsInline
                  style={{width:'100%',borderRadius:12,marginTop:12,maxHeight:400}}
                />
              )}
              <FeedComments postId={post.id} postAuthorId={post.autorId} postText={post.texto} />
            </div>
          ))}

          <div style={{display:'flex',justifyContent:'center',padding:'10px 0 26px'}}>
            {hasMore ? (
              <button onClick={cargarMas} disabled={loadingMore} className="fju-chip" type="button">
                {loadingMore ? 'Cargando...' : 'Cargar mas'}
              </button>
            ) : (
              <div style={{color:'#999',fontSize:'12.5px'}}>No hay mas publicaciones.</div>
            )}
          </div>
        </div>
      )}

      {vista === 'chat' && (
        <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 73px)'}}>
          <div style={{flex:1,overflowY:'auto',padding:'20px',maxWidth:'700px',width:'100%',margin:'0 auto',boxSizing:'border-box'}}>
            {mensajesChat.length === 0 && <div style={{textAlign:'center',padding:'40px',color:'#aaa'}}><p style={{fontSize:'48px'}}>💬</p><p>Aun no hay mensajes!</p></div>}
            {mensajesChat.map(msg => {
              const esMio = msg.autorId === auth.currentUser?.uid;
              return (
                <div key={msg.id} style={{display:'flex',justifyContent:esMio?'flex-end':'flex-start',marginBottom:'12px'}}>
                  {!esMio && <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#b1125a,#e04386)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'13px',marginRight:'8px',flexShrink:0}}>{msg.autor.charAt(0).toUpperCase()}</div>}
                  <div style={{maxWidth:'70%'}}>
                    {!esMio && <p style={{margin:'0 0 4px',fontSize:'12px',color:'#888',fontWeight:'600'}}>{msg.autor}</p>}
                    <div style={{background:esMio?'#9d174d':'white',color:esMio?'white':'#333',padding:'10px 16px',borderRadius:esMio?'18px 18px 4px 18px':'18px 18px 18px 4px',boxShadow:'0 1px 4px rgba(0,0,0,0.1)',fontSize:'15px'}}>{msg.texto}</div>
                    <p style={{margin:'4px 0 0',fontSize:'11px',color:'#aaa',textAlign:esMio?'right':'left'}}>{new Date(msg.fecha).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{background:'white',padding:'16px',boxShadow:'0 -2px 8px rgba(0,0,0,0.08)'}}>
            <div style={{maxWidth:'700px',margin:'0 auto',display:'flex',gap:'12px'}}>
              <textarea placeholder="Escribe un mensaje..." value={nuevoMsg} onChange={(e)=>setNuevoMsg(e.target.value)} onKeyDown={handleKey} style={{flex:1,padding:'12px',borderRadius:'12px',border:'2px solid #eee',fontSize:'15px',outline:'none',resize:'none',maxHeight:'80px',fontFamily:'system-ui'}} />
              <button onClick={enviarChat} style={{padding:'12px 24px',background:'linear-gradient(135deg,#b1125a,#e04386)',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',cursor:'pointer',fontWeight:'700'}}>Enviar</button>
            </div>
          </div>
        </div>
      )}

      {vista === 'privado' && !contacto && (
        <div style={{maxWidth:'600px',margin:'24px auto',padding:'0 16px'}}>
          <h3 style={{color:'#9d174d',marginBottom:'16px'}}>Selecciona un contacto</h3>
          {usuarios.map(u => (
            <div key={u.id} onClick={()=>setContacto(u)} style={{background:'white',borderRadius:'16px',padding:'16px 20px',marginBottom:'8px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'linear-gradient(135deg,#b1125a,#e04386)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'18px'}}>
                {u.nombre ? u.nombre.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <p style={{margin:0,fontWeight:'700',color:'#9d174d'}}>{u.nombre || 'Sin nombre'}</p>
                <p style={{margin:0,fontSize:'12px',color:'#aaa'}}>{u.rol}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {vista === 'privado' && contacto && (
        <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 73px)'}}>
          <div style={{background:'white',padding:'12px 24px',borderBottom:'1px solid #eee',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setContacto(null)} style={{background:'#9d174d',color:'white',border:'none',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>Atras</button>
            <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#b1125a,#e04386)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700'}}>
              {contacto.nombre.charAt(0).toUpperCase()}
            </div>
            <p style={{margin:0,fontWeight:'700',color:'#9d174d'}}>{contacto.nombre}</p>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'20px',maxWidth:'700px',width:'100%',margin:'0 auto',boxSizing:'border-box'}}>
            {mensajesPrivado.length === 0 && <div style={{textAlign:'center',padding:'40px',color:'#aaa'}}><p style={{fontSize:'48px'}}>🔒</p><p>Conversacion privada con {contacto.nombre}</p></div>}
            {mensajesPrivado.map(msg => {
              const esMio = msg.autorId === auth.currentUser?.uid;
              return (
                <div key={msg.id} style={{display:'flex',justifyContent:esMio?'flex-end':'flex-start',marginBottom:'12px'}}>
                  {!esMio && <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#b1125a,#e04386)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'13px',marginRight:'8px',flexShrink:0}}>{msg.autor.charAt(0).toUpperCase()}</div>}
                  <div style={{maxWidth:'70%'}}>
                    <div style={{background:esMio?'#9d174d':'white',color:esMio?'white':'#333',padding:'10px 16px',borderRadius:esMio?'18px 18px 4px 18px':'18px 18px 18px 4px',boxShadow:'0 1px 4px rgba(0,0,0,0.1)',fontSize:'15px'}}>{msg.texto}</div>
                    <p style={{margin:'4px 0 0',fontSize:'11px',color:'#aaa',textAlign:esMio?'right':'left'}}>{new Date(msg.fecha).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{background:'white',padding:'16px',boxShadow:'0 -2px 8px rgba(0,0,0,0.08)'}}>
            <div style={{maxWidth:'700px',margin:'0 auto',display:'flex',gap:'12px'}}>
              <textarea placeholder="Escribe un mensaje privado..." value={nuevoMsg} onChange={(e)=>setNuevoMsg(e.target.value)} onKeyDown={handleKey} style={{flex:1,padding:'12px',borderRadius:'12px',border:'2px solid #eee',fontSize:'15px',outline:'none',resize:'none',maxHeight:'80px',fontFamily:'system-ui'}} />
              <button onClick={enviarPrivado} style={{padding:'12px 24px',background:'linear-gradient(135deg,#b1125a,#e04386)',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',cursor:'pointer',fontWeight:'700'}}>Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Feed;


