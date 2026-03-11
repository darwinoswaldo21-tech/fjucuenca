import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert('Bienvenido!');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{minHeight:'100vh',background:'#1B2A6B',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'20px',padding:'48px',width:'360px'}}>
        <h1 style={{color:'#1B2A6B',textAlign:'center'}}>FJU Cuenca</h1>
        <p style={{color:'#B8860B',textAlign:'center'}}>Bienvenido a tu comunidad</p>
        {error && <p style={{color:'red'}}>{error}</p>}
        <input type="email" placeholder="Correo" value={email} onChange={(e)=>setEmail(e.target.value)} style={{width:'100%',padding:'12px',marginBottom:'12px',borderRadius:'8px',border:'1px solid #ddd',boxSizing:'border-box'}} />
        <input type="password" placeholder="Contrasena" value={password} onChange={(e)=>setPassword(e.target.value)} style={{width:'100%',padding:'12px',marginBottom:'20px',borderRadius:'8px',border:'1px solid #ddd',boxSizing:'border-box'}} />
        <button onClick={handleLogin} style={{width:'100%',padding:'14px',background:'#1B2A6B',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',cursor:'pointer'}}>Ingresar</button>
      </div>
    </div>
  );
}

export default Login;