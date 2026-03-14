import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import FeedComments from './FeedComments';

function Feed({ usuario, onLogout, onAdmin, onHelp, onMedias }) {
  const [posts, setPosts] = useState([]);
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

  const mostrarNotif = (msg, tipo) => {
    setNotif({msg, tipo});
    setTimeout(() => setNotif(null), 4000);
  };

  const cargarUsuarios = async () => {
    const snap = await getDocs(collection(db, 'usuarios'));
    setUsuarios(snap.docs.map(d => ({id: d.id, ...d.data()})).filter(u => u.id !== auth.currentUser.uid));
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('fecha', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'chat'), orderBy('fecha', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMensajesChat(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!contacto) return;
    const chatId = [auth.currentUser.uid, contacto.id].sort().join('_');
    const q = query(collection(db, 'chatprivado'), where('chatId', '==', chatId), orderBy('fecha', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMensajesPrivado(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, [contacto]);

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
    <button onClick={()=>setVista(v)} style={{background:vista===v?'rgba(255,255,255,0.4)':'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}>
      {label}
    </button>
  );

  return (
    <div style={{minHeight:'100vh',background:'#f0f2f5',fontFamily:'system-ui'}}>
      {notif && (
        <div style={{position:'fixed',top:'24px',left:'50%',transform:'translateX(-50%)',background:notif.tipo==='exito'?'#1B2A6B':'#e53e3e',color:'white',padding:'16px 32px',borderRadius:'12px',boxShadow:'0 8px 32px rgba(0,0,0,0.25)',fontSize:'15px',fontWeight:'500',zIndex:1000,textAlign:'center',minWidth:'300px'}}>
          {notif.tipo==='exito'?'OK: ':'ERROR: '}{notif.msg}
        </div>
      )}

      {/* Navbar */}
      <div style={{background:'#1B2A6B',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <img src="/fondo1.jpg" alt="FJU" style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',border:'2px solid white'}} />
          <span style={{color:'white',fontWeight:'700',fontSize:'18px'}}>FJU Cuenca</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
          {navBtn('feed', 'Inicio')}
          {navBtn('chat', 'Chat')}
          {navBtn('privado', 'Privado')}
          <button onClick={onHelp} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}>
            🙏 Help
          </button>
          <button onClick={onMedias} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}>
            📸 Medios
          </button>
          {onAdmin && (
            <button onClick={onAdmin} style={{background:'#B8860B',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}>Admin</button>
          )}
          <span style={{color:'rgba(255,255,255,0.8)',fontSize:'14px'}}>Hola, {usuario.nombre}</span>
          <button onClick={onLogout} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>Salir</button>
        </div>
      </div>

      {vista === 'feed' && (
        <div style={{maxWidth:'600px',margin:'24px auto',padding:'0 16px'}}>
          {/* Crear post */}
          <div style={{background:'white',borderRadius:'16px',padding:'20px',marginBottom:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
            <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'16px',flexShrink:0}}>
                {usuario.nombre.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <textarea
                  placeholder="Comparte algo con la comunidad FJU..."
                  value={nuevo}
                  onChange={(e)=>setNuevo(e.target.value)}
                  style={{width:'100%',padding:'12px',borderRadius:'10px',border:'2px solid #eee',fontSize:'15px',outline:'none',resize:'none',minHeight:'80px',boxSizing:'border-box',fontFamily:'system-ui'}}
                />
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'8px'}}>
                  <span style={{color:'#aaa',fontSize:'13px'}}>Comparte con amor ✝️</span>
                  <button onClick={publicar} disabled={loading} style={{padding:'10px 24px',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',cursor:loading?'not-allowed':'pointer',fontWeight:'600'}}>
                    {loading?'Enviando...':'Publicar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts */}
          {posts.filter(p=>p.aprobado).length === 0 && (
            <div style={{textAlign:'center',padding:'40px',color:'#aaa'}}>
              <p style={{fontSize:'48px'}}>✝️</p>
              <p>Aun no hay publicaciones. Se el primero en compartir!</p>
            </div>
          )}
          {posts.filter(p=>p.aprobado).map(post => (
            <div key={post.id} style={{background:'white',borderRadius:'16px',padding:'20px',marginBottom:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'16px'}}>
                  {post.autor.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{margin:0,fontWeight:'700',color:'#1B2A6B'}}>{post.autor}</p>
                  <p style={{margin:0,fontSize:'12px',color:'#aaa'}}>
                    {new Date(post.fecha).toLocaleDateString('es-EC',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
                {post.tipo === 'foto' && (
                  <span style={{marginLeft:'auto',background:'#EEF1FF',color:'#1B2A6B',fontSize:'11px',padding:'3px 10px',borderRadius:20,fontWeight:600}}>📸 Medios</span>
                )}
                {(post.tipo === 'video' || post.tipo === 'videoDirecto') && (
                  <span style={{marginLeft:'auto',background:'#EEF1FF',color:'#1B2A6B',fontSize:'11px',padding:'3px 10px',borderRadius:20,fontWeight:600}}>🎥 Medios</span>
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
              <FeedComments postId={post.id} />
            </div>
          ))}
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
                  {!esMio && <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'13px',marginRight:'8px',flexShrink:0}}>{msg.autor.charAt(0).toUpperCase()}</div>}
                  <div style={{maxWidth:'70%'}}>
                    {!esMio && <p style={{margin:'0 0 4px',fontSize:'12px',color:'#888',fontWeight:'600'}}>{msg.autor}</p>}
                    <div style={{background:esMio?'#1B2A6B':'white',color:esMio?'white':'#333',padding:'10px 16px',borderRadius:esMio?'18px 18px 4px 18px':'18px 18px 18px 4px',boxShadow:'0 1px 4px rgba(0,0,0,0.1)',fontSize:'15px'}}>{msg.texto}</div>
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
              <button onClick={enviarChat} style={{padding:'12px 24px',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',cursor:'pointer',fontWeight:'700'}}>Enviar</button>
            </div>
          </div>
        </div>
      )}

      {vista === 'privado' && !contacto && (
        <div style={{maxWidth:'600px',margin:'24px auto',padding:'0 16px'}}>
          <h3 style={{color:'#1B2A6B',marginBottom:'16px'}}>Selecciona un contacto</h3>
          {usuarios.map(u => (
            <div key={u.id} onClick={()=>setContacto(u)} style={{background:'white',borderRadius:'16px',padding:'16px 20px',marginBottom:'8px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'18px'}}>
                {u.nombre ? u.nombre.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <p style={{margin:0,fontWeight:'700',color:'#1B2A6B'}}>{u.nombre || 'Sin nombre'}</p>
                <p style={{margin:0,fontSize:'12px',color:'#aaa'}}>{u.rol}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {vista === 'privado' && contacto && (
        <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 73px)'}}>
          <div style={{background:'white',padding:'12px 24px',borderBottom:'1px solid #eee',display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={()=>setContacto(null)} style={{background:'#1B2A6B',color:'white',border:'none',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>Atras</button>
            <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700'}}>
              {contacto.nombre.charAt(0).toUpperCase()}
            </div>
            <p style={{margin:0,fontWeight:'700',color:'#1B2A6B'}}>{contacto.nombre}</p>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'20px',maxWidth:'700px',width:'100%',margin:'0 auto',boxSizing:'border-box'}}>
            {mensajesPrivado.length === 0 && <div style={{textAlign:'center',padding:'40px',color:'#aaa'}}><p style={{fontSize:'48px'}}>🔒</p><p>Conversacion privada con {contacto.nombre}</p></div>}
            {mensajesPrivado.map(msg => {
              const esMio = msg.autorId === auth.currentUser?.uid;
              return (
                <div key={msg.id} style={{display:'flex',justifyContent:esMio?'flex-end':'flex-start',marginBottom:'12px'}}>
                  {!esMio && <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'13px',marginRight:'8px',flexShrink:0}}>{msg.autor.charAt(0).toUpperCase()}</div>}
                  <div style={{maxWidth:'70%'}}>
                    <div style={{background:esMio?'#1B2A6B':'white',color:esMio?'white':'#333',padding:'10px 16px',borderRadius:esMio?'18px 18px 4px 18px':'18px 18px 18px 4px',boxShadow:'0 1px 4px rgba(0,0,0,0.1)',fontSize:'15px'}}>{msg.texto}</div>
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
              <button onClick={enviarPrivado} style={{padding:'12px 24px',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',cursor:'pointer',fontWeight:'700'}}>Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Feed;