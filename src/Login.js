import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import './Login.css';

function Login({ onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);

  const mostrarNotif = (msg, tipo) => {
    setNotif({ msg, tipo });
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
      if (
        err.code === 'auth/user-not-found'
        || err.code === 'auth/wrong-password'
        || err.code === 'auth/invalid-credential'
      ) {
        mostrarNotif('Correo o contrasena incorrectos', 'error');
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
      mostrarNotif('Correo de recuperacion enviado!', 'exito');
    } catch (err) {
      mostrarNotif('No se encontro ese correo', 'error');
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="fju-auth">
      {notif && (
        <div className={`fju-toastAuth ${notif.tipo === 'exito' ? '' : 'fju-toastErr'}`}>
          {notif.tipo === 'exito' ? 'OK: ' : 'ERROR: '}
          {notif.msg}
        </div>
      )}

      <div className="fju-authGrid">
        <div className="fju-hero">
          <div
            className="fju-heroInner"
            style={{
              '--fju-hero-img': `url("${process.env.PUBLIC_URL}/mi-bienvenida.jpg")`,
            }}
          >
            <div className="fju-heroContent">
              <div className="fju-heroBadge">
                <span className="fju-heroMark">F</span>
                Comunidad FJU Cuenca
              </div>
              <h1 className="fju-heroTitle">Explora lo que mas te gusta.</h1>
              <p className="fju-heroSub">
                Una red social para jovenes de la iglesia: comparte, comenta, mira series,
                y mantente conectado con tu comunidad.
              </p>
              <ul className="fju-heroList">
                <li className="fju-heroItem"><span className="fju-heroDot" /> Feed de la comunidad</li>
                <li className="fju-heroItem"><span className="fju-heroDot" /> Mensajes privados</li>
                <li className="fju-heroItem"><span className="fju-heroDot" /> Grupos y series</li>
                <li className="fju-heroItem"><span className="fju-heroDot" /> Medios (fotos/videos)</li>
                <li className="fju-heroItem"><span className="fju-heroDot" /> Help y recursos</li>
                <li className="fju-heroItem"><span className="fju-heroDot" /> Notificaciones</li>
              </ul>
            </div>
            <div className="fju-heroFooter">
              <div>Unidos en Cristo. Comparte con amor.</div>
              <div className="fju-heroFooterRight">FJU Cuenca</div>
            </div>
          </div>
        </div>

        <div className="fju-authCard">
          <div className="fju-authHead">
            <img src="/fondo1.jpg" alt="FJU" className="fju-authLogo" />
            <h1 className="fju-authTitle">FJU Cuenca</h1>
            <p className="fju-authSub">Inicia sesion para continuar</p>
          </div>

          <label className="fju-label">CORREO ELECTRONICO</label>
          <input
            type="email"
            placeholder="tucorreo@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKey}
            className="fju-input"
          />

          <label className="fju-label">CONTRASENA</label>
          <div className="fju-passWrap">
            <input
              type={verPass ? 'text' : 'password'}
              placeholder="Tu contrasena"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKey}
              className="fju-input"
              style={{ paddingRight: 48, marginBottom: 0 }}
            />
            <button
              onClick={() => setVerPass(!verPass)}
              className="fju-passBtn"
              type="button"
              aria-label="Ver contrasena"
            >
              {verPass ? '🙈' : '👁️'}
            </button>
          </div>

          <div className="fju-authActions">
            <button onClick={handleOlvide} className="fju-linkBtn" type="button">
              Olvide mi contrasena
            </button>
          </div>

          <button onClick={handleLogin} disabled={loading} className="fju-primary" type="button">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
          <button onClick={onRegister} className="fju-secondary" type="button">
            No tengo cuenta - Registrarme
          </button>

          <p className="fju-authFoot">FJU Cuenca</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
