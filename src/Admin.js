import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

function Admin({ usuario, onLogout, onFeed }) {
  const [posts, setPosts] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tab, setTab] = useState('posts');
  const [notif, setNotif] = useState(null);
  const [reparando, setReparando] = useState(false);
  const [reporteReparacion, setReporteReparacion] = useState(null);

  const canModeratePosts = usuario?.rol === 'admin' || usuario?.rol === 'moderador';
  const canManageUsers = usuario?.rol === 'admin';

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
    if (canModeratePosts) cargarPosts();
    if (canManageUsers) cargarUsuarios();
  }, [canModeratePosts, canManageUsers]);

  const aprobarPost = async (id) => {
    if (!canModeratePosts) return;
    await updateDoc(doc(db, 'posts', id), {aprobado: true});
    mostrarNotif('Post aprobado!', 'exito');
    cargarPosts();
  };

  const eliminarPost = async (id) => {
    if (!canModeratePosts) return;
    await deleteDoc(doc(db, 'posts', id));
    mostrarNotif('Post eliminado', 'error');
    cargarPosts();
  };

  const aprobarUsuario = async (id) => {
    if (!canManageUsers) return;
    await updateDoc(doc(db, 'usuarios', id), {aprobado: true});
    mostrarNotif('Usuario aprobado!', 'exito');
    cargarUsuarios();
  };

  const cambiarRol = async (id, rol) => {
    if (!canManageUsers) return;
    await updateDoc(doc(db, 'usuarios', id), {rol});
    mostrarNotif('Rol actualizado!', 'exito');
    cargarUsuarios();
  };

  // SCRIPT: corregir posts y comentarios con autor "Usuario"
  const repararNombres = async () => {
    if (!canManageUsers) return;
    if (!window.confirm('Corregir todos los posts y comentarios que dicen "Usuario"?')) return;
    setReparando(true);
    setReporteReparacion(null);

    let postsCorregidos = 0;
    let comentariosCorregidos = 0;
    let errores = 0;

    try {
      // Cargar todos los usuarios para tener el mapa uid -> nombre
      const usuariosSnap = await getDocs(collection(db, 'usuarios'));
      const mapaUsuarios = {};
      usuariosSnap.docs.forEach(d => {
        const data = d.data();
        if (data.nombre && data.nombre.trim() !== '') {
          mapaUsuarios[d.id] = data.nombre;
        }
      });

      // Corregir posts con autor "Usuario"
      const postsSnap = await getDocs(collection(db, 'posts'));
      for (const postDoc of postsSnap.docs) {
        const post = postDoc.data();

        // Corregir autor del post
        if ((!post.autor || post.autor.trim() === '' || post.autor === 'Usuario') && post.autorId) {
          const nombreReal = mapaUsuarios[post.autorId];
          if (nombreReal) {
            try {
              await updateDoc(doc(db, 'posts', postDoc.id), { autor: nombreReal });
              postsCorregidos++;
            } catch (e) {
              errores++;
            }
          }
        }

        // Corregir comentarios dentro de cada post
        const commentsSnap = await getDocs(collection(db, 'posts', postDoc.id, 'comments'));
        for (const commentDoc of commentsSnap.docs) {
          const comment = commentDoc.data();
          if ((!comment.displayName || comment.displayName.trim() === '' || comment.displayName === 'Usuario') && comment.uid) {
            const nombreReal = mapaUsuarios[comment.uid];
            if (nombreReal) {
              try {
                await updateDoc(doc(db, 'posts', postDoc.id, 'comments', commentDoc.id), { displayName: nombreReal });
                comentariosCorregidos++;
              } catch (e) {
                errores++;
              }
            }
          }
        }
      }

      setReporteReparacion({ postsCorregidos, comentariosCorregidos, errores });
      mostrarNotif(`Reparacion completa: ${postsCorregidos} posts y ${comentariosCorregidos} comentarios corregidos`, 'exito');
      cargarPosts();
    } catch (e) {
      mostrarNotif('Error en la reparacion: ' + e.message, 'error');
    }
    setReparando(false);
  };

  return (
    <div style={{minHeight:'100vh',background:'#f0f2f5',fontFamily:'system-ui'}}>
      {notif && (
        <div style={{position:'fixed',top:'24px',left:'50%',transform:'translateX(-50%)',background:notif.tipo==='exito'?'#1B2A6B':'#e53e3e',color:'white',padding:'16px 32px',borderRadius:'12px',boxShadow:'0 8px 32px rgba(0,0,0,0.25)',fontSize:'15px',fontWeight:'500',zIndex:1000,textAlign:'center',minWidth:'300px'}}>
          {notif.tipo==='exito' ? 'OK: ' : 'X: '}{notif.msg}
        </div>
      )}
      <div style={{background:'#1B2A6B',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <img src="/fondo1.jpg" alt="FJU" style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',border:'2px solid white'}} />
          <div>
            <span style={{color:'white',fontWeight:'700',fontSize:'18px'}}>
              {canManageUsers ? 'Panel Admin' : 'Panel Moderacion'}
            </span>
            <p style={{color:'rgba(255,255,255,0.7)',margin:0,fontSize:'12px'}}>FJU Cuenca</p>
          </div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={onFeed} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>Ver Feed</button>
          <button onClick={onLogout} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>Salir</button>
        </div>
      </div>

      <div style={{maxWidth:'800px',margin:'24px auto',padding:'0 16px'}}>
        <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
          <button onClick={()=>setTab('posts')} style={{padding:'10px 24px',background:tab==='posts'?'#1B2A6B':'white',color:tab==='posts'?'white':'#1B2A6B',border:'2px solid #1B2A6B',borderRadius:'8px',cursor:'pointer',fontWeight:'600'}}>
            Posts ({posts.filter(p=>!p.aprobado).length} pendientes)
          </button>

          {canManageUsers && (
            <button onClick={()=>setTab('usuarios')} style={{padding:'10px 24px',background:tab==='usuarios'?'#1B2A6B':'white',color:tab==='usuarios'?'white':'#1B2A6B',border:'2px solid #1B2A6B',borderRadius:'8px',cursor:'pointer',fontWeight:'600'}}>
              Usuarios ({usuarios.filter(u=>!u.aprobado).length} pendientes)
            </button>
          )}

          {canManageUsers && (
            <button onClick={()=>setTab('reparar')} style={{padding:'10px 24px',background:tab==='reparar'?'#B8860B':'white',color:tab==='reparar'?'white':'#B8860B',border:'2px solid #B8860B',borderRadius:'8px',cursor:'pointer',fontWeight:'600'}}>
              Reparar nombres
            </button>
          )}
        </div>

        {tab==='posts' && !canManageUsers && posts.filter(p => !p.aprobado).length === 0 && (
          <div style={{background:'white',borderRadius:'16px',padding:'24px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',color:'#666',textAlign:'center'}}>
            No hay posts pendientes.
          </div>
        )}

        {tab==='posts' && (canManageUsers ? posts : posts.filter(p => !p.aprobado)).map(post => (
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
                  Aprobar
                </button>
              )}
              <button onClick={()=>eliminarPost(post.id)} style={{padding:'8px 16px',background:'#e53e3e',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {canManageUsers && tab==='usuarios' && usuarios.map(u => (
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
                <span style={{background:u.emailVerificado?'#d4edda':'#fff3cd',color:u.emailVerificado?'#155724':'#856404',padding:'4px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'700'}}>
                  {u.emailVerificado ? 'Email verificado' : 'Email (pendiente de sync)'}
                </span>
                {!u.aprobado && (
                  <button
                    onClick={()=>aprobarUsuario(u.id)}
                    style={{padding:'8px 16px',background:'#1B2A6B',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}
                    title="Aprobar usuario"
                  >
                    Aprobar
                  </button>
                )}
                {u.aprobado && <span style={{background:'#d4edda',color:'#155724',padding:'4px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'600'}}>Activo</span>}
              </div>
            </div>
          </div>
        ))}

        {canManageUsers && tab==='reparar' && (
          <div style={{background:'white',borderRadius:'16px',padding:'32px',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',textAlign:'center'}}>
            <p style={{fontSize:'44px',margin:'0 0 12px',letterSpacing:'2px',fontWeight:'800',color:'#B8860B'}}>REPARAR</p>
            <h3 style={{color:'#1B2A6B',margin:'0 0 8px'}}>Reparar nombres en posts y comentarios</h3>
            <p style={{color:'#666',fontSize:'14px',margin:'0 0 24px',lineHeight:'1.6'}}>
              Este script busca todos los posts y comentarios que tienen autor <strong>"Usuario"</strong> y los corrige automaticamente usando el nombre real guardado en Firestore.
            </p>
            <button
              onClick={repararNombres}
              disabled={reparando}
              style={{padding:'14px 32px',background:reparando?'#aaa':'#B8860B',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',cursor:reparando?'not-allowed':'pointer',fontWeight:'700'}}
            >
              {reparando ? 'Reparando...' : 'Iniciar reparacion'}
            </button>

            {reporteReparacion && (
              <div style={{marginTop:'24px',background:'#f0f7ff',borderRadius:'12px',padding:'20px'}}>
                <p style={{margin:'0 0 8px',fontWeight:'700',color:'#1B2A6B'}}>Reparacion completada</p>
                <p style={{margin:'0 0 4px',color:'#333',fontSize:'14px'}}>Posts corregidos: <strong>{reporteReparacion.postsCorregidos}</strong></p>
                <p style={{margin:'0 0 4px',color:'#333',fontSize:'14px'}}>Comentarios corregidos: <strong>{reporteReparacion.comentariosCorregidos}</strong></p>
                {reporteReparacion.errores > 0 && (
                  <p style={{margin:'0',color:'#e53e3e',fontSize:'14px'}}>Errores: <strong>{reporteReparacion.errores}</strong></p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
