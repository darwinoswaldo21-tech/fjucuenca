import React, { useState } from 'react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function Register({ onBack }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notif, setNotif] = useState(null);

  const mostrarNotif = (mensaje, tipo) => {
    setNotif({ mensaje, tipo });
    setTimeout(() => setNotif(null), 5000);
  };

  const handleRegister = async () => {
    if (!nombre || !email || !password) {
      mostrarNotif('Por favor llena todos los campos', 'error');
      return;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'usuarios', result.user.uid), {
        nombre, email, rol: 'miembro', aprobado: false,
        fechaRegistro: new Date().toISOString()
      });
      mostrarNotif('Registro exitoso! El pastor revisara tu cuenta pronto.', 'exito');
      setTimeout(() => onBack(), 5000);
    } catch (err) {
      mostrarNotif(err.message, 'error');
    }
  };

  return (
    <div style={{minHeight:'100vh',background:'#1B2A6B',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui'}}>
      {notif && (
        <div style={{
          position:'fixed', top:'24px', left:'50%', transform:'translateX(-50%)',
          background: notif.tipo === 'exito' ? '#1B2A6B' : '#e53e3e',
          color:'white', padding:'16px 32px', borderRadius:'12px',
          boxShadow:'0 8px 32px rgba(0,0,0,0.25)', fontSize:'15px',
          fontWeight:'500', zIndex:1000, textAlign:'center',
          minWidth:'300px', letterSpacing:'0.3px'
        }}>
          {notif.tipo === 'exito' ? '✓ ' : '✕ '}{notif.mensaje}
        </div>
      )}
      <div style={{background:'white',borderRadius:'20px',padding:'48px',width:'360px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <h1 style={{color:'#1B2A6B',textAlign:'center',marginBottom:'4px'}}>FJU Cuenca</h1>
        <p style={{color:'#B8860B',textAlign:'center',marginBottom:'24px'}}>Crear cuenta</p>
        <input type="text" placeholder="Nombre completo" value={nombre} onChange={(e)=>setNombre(e.target.value)} style={{width:'100%',padding:'12px',marginBottom:'12px',borderRadius:'8px',border:'1px solid #ddd',boxSizing:'border-box',fontSize:'15px'}} />
        <input type="email" placeholder="Correo electronico" value={email} onChange={(e)=>setEmail(e.target.value)} style={{width:'100%',padding:'12px',marginBottom:'12px',borderRadius:'8px',border:'1px solid #ddd',boxSizing:'border-box',fontSize:'15px'}} />
        <input type="password" placeholder="Contrasena" value={password} onChange={(e)=>setPassword(e.target.value)} style={{width:'100%',padding:'12px',marginBottom:'20px',borderRadius:'8px',border:'1px solid #ddd',boxSizing:'border-box',fontSize:'15px'}} />
        <button onClick={handleRegister} style={{width:'100%',padding:'14px',background:'#1B2A6B',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',cursor:'pointer',marginBottom:'12px',fontWeight:'600'}}>Registrarse</button>
        <button onClick={onBack} style={{width:'100%',padding:'12px',background:'white',color:'#1B2A6B',border:'2px solid #1B2A6B',borderRadius:'8px',fontSize:'16px',cursor:'pointer',fontWeight:'600'}}>Volver al Login</button>
      </div>
    </div>
  );
}

export default Register;