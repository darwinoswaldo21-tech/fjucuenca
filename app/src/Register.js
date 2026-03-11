import React, { useState } from 'react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function Register({ onBack }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!nombre || !email || !password) {
      setError('Por favor llena todos los campos');
      return;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'usuarios', result.user.uid), {
        nombre: nombre,
        email: email,
        rol: 'miembro',
        aprobado: false,
        fechaRegistro: new Date().toISOString()
      });
      alert('Registro exitoso! Espera aprobacion del pastor.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{minHeight:'100vh',background:'#1B2A6B',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'20px',padding:'48px',width:'360px'}}>
        <h1 style={{color:'#1B2A6B',textAlign:'center'}}>FJU Cuenca</h1>
        <p style={{color:'#B8860B',textAlign:'center'}}>Crear cuenta</p>
        {error && <p style={{color:'red',fontSize:'14px'}}>{error}</p>}
        <input type="text" placeholder="Nombre completo" value={nombre} onChange={(e)=>setNombre(e.target.value)} style={{width:'100%',padding:'12px',marginBottom:'12px',borderRadius:'8px',border:'1px solid #ddd',boxSizing:'border-box'}} />
        <input type="email" placeholder="Correo" value={email} onChange={(e)=>setEmail(e.target.value)} style={{width:'100%',padding:'12px',marginBottom:'12px',borderRadius:'8px',border:'1px solid #ddd',boxSizing:'border-box'}} />
        <input type="password" placeholder="Contrasena" value={password} onChange={(e)=>setPassword(e.target.value)} style={{width:'100%',padding:'12px',marginBottom:'20px',borderRadius:'8px',border:'1px solid #ddd',boxSizing:'border-box'}} />
        <button onClick={handleRegister} style={{width:'100%',padding:'14px',background:'#1B2A6B',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',cursor:'pointer',marginBottom:'12px'}}>Registrarse</button>
        <button onClick={onBack} style={{width:'100%',padding:'12px',background:'white',color:'#1B2A6B',border:'2px solid #1B2A6B',borderRadius:'8px',fontSize:'16px',cursor:'pointer'}}>Volver al Login</button>
      </div>
    </div>
  );
}

export default Register;
