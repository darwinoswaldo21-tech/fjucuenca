import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';

function Feed({ usuario, onLogout, onAdmin, onChat }) {
  const [posts, setPosts] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);

  const mostrarNotif = (msg, tipo) => {
    setNotif({msg, tipo});
    setTimeout(() => setNotif(null), 4000);
  };

  const cargarPosts = async () => {
    try {
      const q = query(collection(db, 'posts'), orderBy('fecha', 'desc'));
      const snap = await getDocs(q);
      setPosts(snap.docs.map(d => ({id: d.id, ...d.data()})));
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    cargarPosts();
  }, []);

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
      cargarPosts();
    } catch (err) {
      mostrarNotif('Error al publicar', 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:'#f0f2f5',fontFamily:'system-ui'}}>
      {notif && (
        <div style={{position:'fixed',top:'24px',left:'50%',transform:'translateX(-50%)',background:notif.tipo==='exito'?'#1B2A6B':'#e53e3e',color:'white',padding:'16px 32px',borderRadius:'12px',boxShadow:'0 8px 32px rgba(0,0,0,0.25)',fontSize:'15px',fontWeight:'500',zIndex:1000,textAlign:'center',minWidth:'300px'}}>
          {notif.tipo==='exito'?'✓ ':'✕ '}{notif.msg}
        </div>
      )}
      <div style={{background:'#1B2A6B',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <img src="/fondo1.jpg" alt="FJU" style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',border:'2px solid white'}} />
          <span style={{color:'white',fontWeight:'700',fontSize:'18px'}}>FJU Cuenca</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          {onAdmin && (
            <button onClick={onAdmin} style={{background:'#B8860B',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}>
              Admin
            </button>
          )}
          <button onClick={onChat} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}>
            💬 Chat
          </button>
          <span style={{color:'rgba(255,255,255,0.8)',fontSize:'14px'}}>Hola, {usuario.nombre}</span>
          <button onClick={onLogout} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>Salir</button>
        </div>
      </div>
      <div style={{maxWidth:'600px',margin:'24px auto',padding:'0 16px'}}>
        <div style={{background:'white',borderRadius:'16px',padding:'20px',marginBottom:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
            <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'16px',flexShrink:0}}>
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <textarea placeholder="Comparte algo con la comunidad FJU..." value={nuevo} onChange={(e)=>setNuevo(e.target.value)} style={{width:'100%',padding:'12px',borderRadius:'10px',border:'2px solid #eee',fontSize:'15px',outline:'none',resize:'none',minHeight:'80px',boxSizing:'border-box',fontFamily:'system-ui'}} />
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'8px'}}>
                <span style={{color:'#aaa',fontSize:'13px'}}>✝️ Comparte con amor</span>
                <button onClick={publicar} disabled={loading} style={{padding:'10px 24px',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',cursor:loading?'not-allowed':'pointer',fontWeight:'600'}}>
                  {loading?'Enviando...':'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
                <p style={{margin:0,fontSize:'12px',color:'#aaa'}}>{new Date(post.fecha).toLocaleDateString('es-EC',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</p>
              </div>
            </div>
            <p style={{margin:0,fontSize:'15px',lineHeight:'1.6',color:'#333'}}>{post.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Feed;