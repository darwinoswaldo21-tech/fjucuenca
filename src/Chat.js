import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, orderBy, query } from 'firebase/firestore';

function Chat({ usuario, onBack }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'chat'), orderBy('fecha', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMensajes(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior:'smooth'});
  }, [mensajes]);

  const enviar = async () => {
    if (!nuevo.trim()) return;
    try {
      await addDoc(collection(db, 'chat'), {
        texto: nuevo,
        autor: usuario.nombre,
        autorId: auth.currentUser.uid,
        fecha: new Date().toISOString()
      });
      setNuevo('');
    } catch (err) {
      console.log(err);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div style={{minHeight:'100vh',background:'#f0f2f5',fontFamily:'system-ui',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1B2A6B',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <img src="/fondo1.jpg" alt="FJU" style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',border:'2px solid white'}} />
          <div>
            <span style={{color:'white',fontWeight:'700',fontSize:'18px'}}>Chat FJU Cuenca</span>
            <p style={{color:'rgba(255,255,255,0.7)',margin:0,fontSize:'12px'}}>Chat general de la comunidad</p>
          </div>
        </div>
        <button onClick={onBack} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>Volver</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'20px',maxWidth:'700px',width:'100%',margin:'0 auto',boxSizing:'border-box'}}>
        {mensajes.length === 0 && (
          <div style={{textAlign:'center',padding:'40px',color:'#aaa'}}>
            <p style={{fontSize:'48px'}}>💬</p>
            <p>Aun no hay mensajes. Se el primero en saludar!</p>
          </div>
        )}
        {mensajes.map(msg => {
          const esMio = msg.autorId === auth.currentUser?.uid;
          return (
            <div key={msg.id} style={{display:'flex',justifyContent:esMio?'flex-end':'flex-start',marginBottom:'12px'}}>
              {!esMio && (
                <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'13px',marginRight:'8px',flexShrink:0}}>
                  {msg.autor.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{maxWidth:'70%'}}>
                {!esMio && <p style={{margin:'0 0 4px',fontSize:'12px',color:'#888',fontWeight:'600'}}>{msg.autor}</p>}
                <div style={{background:esMio?'#1B2A6B':'white',color:esMio?'white':'#333',padding:'10px 16px',borderRadius:esMio?'18px 18px 4px 18px':'18px 18px 18px 4px',boxShadow:'0 1px 4px rgba(0,0,0,0.1)',fontSize:'15px',lineHeight:'1.5'}}>
                  {msg.texto}
                </div>
                <p style={{margin:'4px 0 0',fontSize:'11px',color:'#aaa',textAlign:esMio?'right':'left'}}>
                  {new Date(msg.fecha).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{background:'white',padding:'16px',boxShadow:'0 -2px 8px rgba(0,0,0,0.08)'}}>
        <div style={{maxWidth:'700px',margin:'0 auto',display:'flex',gap:'12px',alignItems:'flex-end'}}>
          <textarea placeholder="Escribe un mensaje... (Enter para enviar)" value={nuevo} onChange={(e)=>setNuevo(e.target.value)} onKeyDown={handleKey} style={{flex:1,padding:'12px',borderRadius:'12px',border:'2px solid #eee',fontSize:'15px',outline:'none',resize:'none',maxHeight:'100px',fontFamily:'system-ui'}} />
          <button onClick={enviar} style={{padding:'12px 24px',background:'linear-gradient(135deg,#1B2A6B,#3d5a99)',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',cursor:'pointer',fontWeight:'700'}}>
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;