import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

function Login({ onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);

  const mostrarNotif = (msg, tipo) => {
    setNotif({msg, tipo});
    setTimeout(() => setNotif(null), 4000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      mostrarNotif('Por favor llena todos los campos', 'error');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      mostrarNotif('Bienvenido a FJU Cuenca!', 'exito');
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        mostrarNotif('Correo o contraseña incorrectos', 'error');
      } else {
        mostrarNotif(err.message, 'error');
      }
    }
    setLoading(false);
  };

  const handleOlvide = async () => {
    if (!email) {
      mostrarNotif('Escribe tu correo primero', 'error');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      mostrarNotif('Correo de recuperación enviado!', 'exito');
    } catch (err) {
      mostrarNotif('No se encontró ese correo', 'error');
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1B2A6B,#0D1533)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      {notif && (
        <div style={{position:'fixed',top:'24px',left:'50%',transform:'translateX(-50%)',background:notif.tipo==='exito'?'#1B2A6B':'#e53e3e',color:'white',padding:'16px 32px',borderRadius:'12px',boxShadow:'0 8px 32px rgba(0,0,0,0.25)',fontSize:'15px',fontWeight:'500',zIndex:1000,textAlign:'center',minWidth:'300px'}}>
          {notif.tipo==='exito'?'✓ ':'✕ '}{notif.msg}
        </div>
      )}
      <div style={{background:'white',borderRadius:'24px',padding:'40px',width:'100%',maxWidth:'400px',boxShadow:'0 24px 80px rgba(0,0,0,0.4)'}}>
        <div style={{textAlign:'center',marginBottom:'28px'}}>
          <img src="/fondo1.jpg" alt="FJU" style={{width:'80px',height:'80px',borderRadius:'50%',objectFit:'cover',border:'3px solid #1B2A6B',marginBottom:'12px'}} />
          <h1 style={{color:'#1B2A6B',margin:'0 0 4px',fontSize:'24px',fontWeight:'700'}}>FJU Cuenca</h1>
          <p style={{color:'#888',margin:0,fontSize:'14px'}}>Bienvenido de vuelta</p>
        </div>
        <label style={{display:'block',color:'#444',fontSize:'12px',fontWeight:'700',marginBottom:'6px'}}>CORREO ELECTRONICO</label>
        <input
          type="email"
          placeholder="tucorreo@gmail.com"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          onKeyDown={handleKey}
          style={{width:'100%',padding:'14px',borderRadius:'10px',border:'2px solid #eee',boxSizing:'border-box',fontSize:'15px',outline:'none',marginBottom:'16px'}}
        />
        <label style={{display:'block',color:'#444',fontSize:'12px',fontWeight:'700',marginBottom:'6px'}}>CONTRASENA</label>
        <div style={{position:'relative',marginBottom:'8px'}}>
          <input
            type={verPass?'text':'password'}
            placeholder="Tu contraseña"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            onKeyDown={handleKey}
            style={{width:'100%',padding:'14px',paddingRight:'48px',borderRadius:'10px',border:'2px solid #eee',boxSizing:'border-box',fontSize:'15px',outline:'none'}}
          />
          <button onClick={()=>setVerPass(!verPass)} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'18px'}}>
            {verPass?'🙈':'👁️'}
          </button>
        </div>
        <div style={{textAlign:'right',marginBottom:'20px'}}>
          <button onClick={handleOlvide} style={{background:'none',border:'none',color:'#1B2A6B',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>
            Olvide mi contraseña
          </button>
        </div>
        <button onClick={handleLogin} disabled={loading} style={{width:'100%',padding:'16px',background:loading?'#888':'linear-gradient(135deg,#1B2A6B,#3d5a99)',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',cursor:loading?'not-allowed':'pointer',fontWeight:'700',marginBottom:'12px'}}>
          {loading?'Ingresando...':'Ingresar'}
        </button>
        <button onClick={onRegister} style={{width:'100%',padding:'14px',background:'transparent',color:'#1B2A6B',border:'2px solid #1B2A6B',borderRadius:'12px',fontSize:'15px',cursor:'pointer',fontWeight:'600'}}>
          No tengo cuenta — Registrarme
        </button>
        <p style={{textAlign:'center',marginTop:'16px',color:'#aaa',fontSize:'12px'}}>Unidos en Cristo ✝️</p>
      </div>
    </div>
  );
}

export default Login;