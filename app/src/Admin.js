import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

function Admin({ usuario, onLogout, onFeed }) {
  const [posts, setPosts] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tab, setTab] = useState('posts');
  const [notif, setNotif] = useState(null);

  const mostrarNotif = (msg, tipo) => {
    setNotif({msg, tipo});
    setTimeout(() => setNotif(null), 4000);
  };

  const cargarPosts = async () => {
    const q = query(collection(db, 'posts'), orderBy('fecha', 'desc'));
    const snap = await getDocs(q);
    setPosts(snap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  const cargarUsuarios = async () => {
    const snap = await getDocs(collection(db, 'usuarios'));
    setUsuarios(snap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  useEffect(() => {
    cargarPosts();
    cargarUsuarios();
  }, []);

  const aprobarPost = async (id) => {
    await updateDoc(doc(db, 'posts', id), {aprobado: true});
    mostrarNotif('Post aprobado!', 'exito');
    cargarPosts();
  };

  const eliminarPost = async (id) => {
    await deleteDoc(doc(db, 'posts', id));
    mostrarNotif('Post eliminado', 'error');
    cargarPosts();
  };

  const aprobarUsuario = async (id) => {
    await updateDoc(doc(db, 'usuarios', id), {aprobado: true});
    mostrarNotif('Usuario aprobado!', 'exito');
    cargarUsuarios();
  };

  const cambiarRol = async (id, rol) => {
    await updateDoc(doc(db, 'usuarios', id), {rol});
    mostrarNotif('Rol actualizado!', 'exito');
    cargarUsuarios();
  };

  return (
    <div style={{minHeight:'100vh',background:'#f0f2f5',fontFamily:'system-ui'}}>
      {notif && (
        <div style={{position:'fixed',top:'24px',left:'50%',transform:'translateX(-50%)',background:notif.tipo==='exito'?'#1B2A6B':'#e53e3e',color:'white',padding:'16px 32px',borderRadius:'12px',boxShadow:'0 8px 32px rgba(0,0,0,0.25)',fontSize:'15px',fontWeight:'500',zIndex:1000,textAlign:'center',minWidth:'300px'}}>
          {notif.tipo==='exito'?'✓ ':'✕ '}{notif.msg}
        </div>
      )}
      <div style={{background:'#1B2A6B',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <img src="/fondo1.jpg" alt="FJU" style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',border:'2px solid white'}} />
          <div>
            <span style={{color:'white',fontWeight:'700',fontSize:'18px'}}>Panel Admin</span>
            <p style={{color:'rgba(255,255,255,0.7)',margin:0,fontSize:'12px'}}>FJU Cuenca</p>
          </div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={onFeed} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>Ver Feed</button>
          <button onClick={onLogout} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>Salir</button>
        </div>
      </div>

      <div style={{maxWidth:'800px',margin:'24px auto',padding:'0 16px'}}>
        <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
          <button onClick={()=>setTab('posts')} style={{padding:'10px 24px',background:tab==='posts'?'#1B2A6B':'white',color:tab==='posts'?'white':'#1B2A6B',border:'2px solid #1B2A6B',borderRadius:'8px',cursor:'pointer',fontWeight:'600'}}>
            Posts ({posts.filter(p=>!p.aprobado).length} pendientes)
          </button>
          <button onClick={()=>setTab('usuarios')} style={{padding:'10px 24px',background:tab==='usuarios'?'#1B2A6B':'white',color:tab==='usuarios'?'white':'#1B2A6B',border:'2px solid #1B2A6B',borderRadius:'8px',cursor:'pointer',fontWeight:'600'}}>
            Usuarios ({usuarios.filter(u=>!u.aprobado).length} pendientes)
          </button>
        </div>

        {tab==='posts' && posts.map(post => (
          <div key={post.id} style={{background:'white',borderRadius:'16px',padding:'20px',marginBottom:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
              <div>
                <p style={{margin:0,fontWeight:'700',color:'#1B2A6B'}}>{post.autor}</p>
                <p style={{margin:0,fontSize:'12px',color:'#aaa'}}>{new Date(post.fecha).toLocaleDateString('es-EC',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</p>
              </div>
              <span style={{background:post.aprobado?'#d4edda':'#fff3cd',color:post.aprobado?'#155724':'#856404',padding:'4px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'600'}}>
                {post.aprobado?'Aprobado':'Pendiente'}
              </span>
            </div>
            <p style={{margin:'0 0 12px',color:'#333'}}>{post.texto}</p>
            <div style={{display:'flex',gap:'8px'}}>
              {!post.aprobado && (
                <button onClick={()=>aprobarPost(post.id)} style={{padding:'8px 16px',background:'#1B2A6B',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>
                  ✓ Aprobar
                </button>
              )}
              <button onClick={()=>eliminarPost(post.id)} style={{padding:'8px 16px',background:'#e53e3e',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>
                ✕ Eliminar
              </button>
            </div>
          </div>
        ))}

        {tab==='usuarios' && usuarios.map(u => (
          <div key={u.id} style={{background:'white',borderRadius:'16px',padding:'20px',marginBottom:'12px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700'}}>
                  {u.nombre ? u.nombre.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <p style={{margin:0,fontWeight:'700',color:'#1B2A6B'}}>{u.nombre || 'Sin nombre'}</p>
                  <p style={{margin:0,fontSize:'12px',color:'#aaa'}}>{u.email}</p>
                </div>
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <select value={u.rol} onChange={(e)=>cambiarRol(u.id, e.target.value)} style={{padding:'6px 12px',borderRadius:'8px',border:'2px solid #eee',fontSize:'13px',cursor:'pointer'}}>
                  <option value="miembro">Miembro</option>
                  <option value="lider">Lider</option>
                  <option value="moderador">Moderador</option>
                  <option value="admin">Admin</option>
                </select>
                {!u.aprobado && (
                  <button onClick={()=>aprobarUsuario(u.id)} style={{padding:'8px 16px',background:'#1B2A6B',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>
                    Aprobar
                  </button>
                )}
                {u.aprobado && <span style={{background:'#d4edda',color:'#155724',padding:'4px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'600'}}>Activo</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;