import React, { useState } from 'react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const S = {
  input: {width:'100%',padding:'14px',borderRadius:'10px',border:'2px solid #eee',boxSizing:'border-box',fontSize:'15px',outline:'none'},
  label: {display:'block',color:'#444',fontSize:'12px',fontWeight:'700',marginBottom:'6px'},
};

function Register({ onBack }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);

  const mostrarNotif = (msg, tipo) => {
    setNotif({msg, tipo});
    setTimeout(() => setNotif(null), 5000);
  };

  const fuerza = password.length===0?0:password.length<6?1:password.length<10?2:3;
  const colores = ['#ddd','#e53e3e','#B8860B','#38a169'];
  const textos = ['','Debil','Regular','Fuerte'];

  const handleRegister = async () => {
    if (!nombre || !email || !password) {
      mostrarNotif('Por favor llena todos los campos','error');
      return;
    }
    if (password.length < 6) {
      mostrarNotif('La contrasena debe tener al menos 6 caracteres','error');
      return;
    }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: nombre });
      await setDoc(doc(db, 'usuarios', result.user.uid), {
        nombre, email, rol:'miembro', aprobado:false,
        fechaRegistro: new Date().toISOString()
      });
      mostrarNotif('Registro exitoso! El pastor revisara tu cuenta pronto.','exito');
      setTimeout(() => onBack(), 5000);
    } catch (err) {
      mostrarNotif(err.message,'error');
    }
    setLoading(false);
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
          <p style={{color:'#888',margin:0,fontSize:'14px'}}>Crea tu cuenta en la comunidad</p>
        </div>
        <label style={S.label}>NOMBRE COMPLETO</label>
        <input type="text" placeholder="Ej: Juan Perez" value={nombre} onChange={(e)=>setNombre(e.target.value)} style={{...S.input,marginBottom:'16px'}} />
        <label style={S.label}>CORREO ELECTRONICO</label>
        <input type="email" placeholder="tucorreo@gmail.com" value={email} onChange={(e)=>setEmail(e.target.value)} style={{...S.input,marginBottom:'16px'}} />
        <label style={S.label}>CONTRASENA</label>
        <div style={{position:'relative',marginBottom:'8px'}}>
          <input type={verPass?'text':'password'} placeholder="Minimo 6 caracteres" value={password} onChange={(e)=>setPassword(e.target.value)} style={{...S.input,paddingRight:'48px'}} />
          <button onClick={()=>setVerPass(!verPass)} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'18px'}}>
            {verPass?'🙈':'👁️'}
          </button>
        </div>
        {password.length>0 && (
          <div style={{marginBottom:'20px'}}>
            <div style={{display:'flex',gap:'4px',marginBottom:'4px'}}>
              {[1,2,3].map(i=>(
                <div key={i} style={{flex:1,height:'4px',borderRadius:'2px',background:fuerza>=i?colores[fuerza]:'#eee'}} />
              ))}
            </div>
            <p style={{margin:0,fontSize:'12px',color:colores[fuerza],fontWeight:'600'}}>{textos[fuerza]}</p>
          </div>
        )}
        <button onClick={handleRegister} disabled={loading} style={{width:'100%',padding:'16px',background:loading?'#888':'linear-gradient(135deg,#1B2A6B,#3d5a99)',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',cursor:loading?'not-allowed':'pointer',fontWeight:'700',marginBottom:'12px'}}>
          {loading?'Creando cuenta...':'Crear cuenta'}
        </button>
        <button onClick={onBack} style={{width:'100%',padding:'14px',background:'transparent',color:'#1B2A6B',border:'2px solid #1B2A6B',borderRadius:'12px',fontSize:'15px',cursor:'pointer',fontWeight:'600'}}>
          Ya tengo cuenta
        </button>
        <p style={{textAlign:'center',marginTop:'16px',color:'#aaa',fontSize:'12px'}}>Al registrarte aceptas ser parte de la comunidad FJU Cuenca</p>
      </div>
    </div>
  );
}

export default Register;