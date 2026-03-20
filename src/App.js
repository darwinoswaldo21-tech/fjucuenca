import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, updateDoc, where } from 'firebase/firestore';
import Login from './Login';
import Register from './Register';
import Feed from './Feed';
import Admin from './Admin';
import Chat from './Chat';
import Messenger from './Messenger';
import HelpScreen from './modules/help/HelpScreen';
import HelpChatScreen from './modules/help/HelpChatScreen';
import ResourcesScreen from './modules/help/ResourcesScreen';
import MediaScreen from './modules/medios/MediaScreen';
import { setPresenceOffline, setPresenceOnline } from './presence';
import GroupListScreen from './groups/GroupListScreen';
import GroupScreen from './groups/GroupScreen';

function App() {
  const [pantalla, setPantalla] = useState('login');
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [helpCategory, setHelpCategory] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [emailPendiente, setEmailPendiente] = useState(null);
  const [revisandoPendiente, setRevisandoPendiente] = useState(false);

  const ADMIN_WA_PHONE = process.env.REACT_APP_ADMIN_WA_PHONE || '';
  const ADMIN_WA_NAME = process.env.REACT_APP_ADMIN_WA_NAME || 'admin';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Asegura que emailVerified este actualizado.
          try {
            await user.reload();
          } catch (e) {
            // No bloquea si falla.
          }

          const userRef = doc(db, 'usuarios', user.uid);
          let snap = await getDoc(userRef);
          let data = null;

          if (!snap.exists()) {
            // Caso comun: el doc existe pero con ID incorrecto (por ejemplo el nombre). Intentamos migrar por email.
            const email = user.email || null;
            const displayName = user.displayName || null;

            const tryLegacyMatch = async (field, value) => {
              if (!value) return null;
              const q = query(collection(db, 'usuarios'), where(field, '==', value), limit(1));
              const qs = await getDocs(q);
              if (qs.empty) return null;
              return qs.docs[0];
            };

            // 1) Por email (si existe en Firestore)
            let legacyDoc = await tryLegacyMatch('email', email);

            // 2) Fallback por nombre (muchos docs viejos no tienen email)
            if (!legacyDoc) legacyDoc = await tryLegacyMatch('nombre', displayName);

            // 3) Fallback final: nombre basado en el correo
            if (!legacyDoc && email) legacyDoc = await tryLegacyMatch('nombre', email.split('@')[0]);

            if (legacyDoc) {
              data = legacyDoc.data();

              // Creamos/normalizamos el doc por UID sin borrar el legacy (evita perdida de datos).
              await setDoc(userRef, { ...data, ...(email ? { email } : {}) }, { merge: true });
              snap = await getDoc(userRef);
            }
          }

          if (snap.exists()) {
            data = snap.data();

            // Sincroniza emailVerificado para que el admin lo vea (best-effort).
            const emailVerificadoActual = !!user.emailVerified;
            if (data.emailVerificado !== emailVerificadoActual) {
              try {
                await updateDoc(doc(db, 'usuarios', user.uid), { emailVerificado: emailVerificadoActual });
                data = { ...data, emailVerificado: emailVerificadoActual };
              } catch (e) {}
            }

            // 1) Exigir verificacion de correo antes de cualquier acceso.
            if (!user.emailVerified) {
              setUsuario(null);
              setEmailPendiente(user.email || null);
              setPantalla('verificarEmail');
              return;
            }

            // Verificar aprobado
            if (data.aprobado === false) {
              setUsuario(null);
              setPantalla('pendiente');
              return;
            }

            const nombreFinal = data.nombre && data.nombre.trim() !== ''
              ? data.nombre
              : user.displayName || user.email?.split('@')[0] || 'Usuario';

            if (!data.nombre || data.nombre.trim() === '') {
              try {
                await updateDoc(doc(db, 'usuarios', user.uid), { nombre: nombreFinal });
              } catch (e) {
                console.log('No se pudo actualizar nombre:', e);
              }
            }

            setUsuario({ ...data, uid: user.uid, nombre: nombreFinal });
            setPantalla(data.rol === 'admin' ? 'admin' : 'feed');

            // Presence (RTDB): no bloquea la app si falla.
            setPresenceOnline(user.uid).catch(() => {});

          } else {
            // Si no existe doc, lo creamos para que el usuario no quede "loggeado pero fuera".
            const nombreFinal =
              user.displayName ||
              user.email?.split('@')[0] ||
              'Usuario';

            await setDoc(userRef, {
              nombre: nombreFinal,
              email: user.email || '',
              rol: 'miembro',
              aprobado: false,
              emailVerificado: !!user.emailVerified,
              fechaRegistro: new Date().toISOString(),
            }, { merge: true });

            if (!user.emailVerified) {
              setUsuario(null);
              setEmailPendiente(user.email || null);
              setPantalla('verificarEmail');
            } else {
              setUsuario(null);
              setPantalla('pendiente');
            }
          }
      } else {
        setUsuario(null);
        setEmailPendiente(null);
        setPantalla('login');
      }
      } catch (e) {
        console.log('Error cargando usuario:', e);
        setUsuario(null);
        setEmailPendiente(null);
        setPantalla('login');
      } finally {
        setCargando(false);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    // Mark offline best-effort.
    if (auth.currentUser?.uid) {
      setPresenceOffline(auth.currentUser.uid).catch(() => {});
    }
    await signOut(auth);
    setEmailPendiente(null);
    setPantalla('login');
  };

  if (cargando) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'#1B2A6B',color:'white',fontSize:'18px'}}>
      Cargando FJU...
    </div>
  );

  const handleReenviarVerificacion = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      alert('Listo! Te enviamos un correo de verificacion. Revisa spam.');
    } catch (e) {
      alert('No se pudo enviar el correo: ' + (e?.message || 'Error'));
    }
  };

  const buildAdminWhatsAppLink = (motivo) => {
    if (!ADMIN_WA_PHONE) return null;

    const u = auth.currentUser;
    const nombre = (u?.displayName || '').trim() || 'Usuario';
    const email = u?.email || '(sin email)';
    const uid = u?.uid || '(sin uid)';

    const msg =
      `Hola ${ADMIN_WA_NAME}, soy ${nombre}. ` +
      `Mi correo es ${email}. ` +
      `Motivo: ${motivo}. ` +
      `UID: ${uid}.`;

    return `https://wa.me/${ADMIN_WA_PHONE}?text=${encodeURIComponent(msg)}`;
  };

  const handleAvisarAdmin = (motivo) => {
    const link = buildAdminWhatsAppLink(motivo);
    if (!link) {
      alert('Falta configurar el WhatsApp del admin (REACT_APP_ADMIN_WA_PHONE).');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const handleYaVerifique = async () => {
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.reload();
      if (!auth.currentUser.emailVerified) {
        alert('Aun no aparece como verificado. Abre el link del correo y vuelve a intentar.');
        return;
      }

      setEmailPendiente(null);

      const user = auth.currentUser;
      const userRef = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        try { await updateDoc(doc(db, 'usuarios', user.uid), { emailVerificado: true }); } catch (e) {}

        if (data.aprobado === false) {
          setUsuario(null);
          setPantalla('pendiente');
          return;
        }

        const nombreFinal = data.nombre && data.nombre.trim() !== ''
          ? data.nombre
          : user.displayName || user.email?.split('@')[0] || 'Usuario';

        setUsuario({ ...data, uid: user.uid, nombre: nombreFinal, emailVerificado: true });
        setPantalla(data.rol === 'admin' ? 'admin' : 'feed');
        return;
      }

      setUsuario(null);
      setPantalla('pendiente');
    } catch (e) {
      alert('No se pudo verificar el estado: ' + (e?.message || 'Error'));
    }
  };

  const handleRevisarAprobacion = async () => {
    if (!auth.currentUser) return;
    if (revisandoPendiente) return;

    setRevisandoPendiente(true);
    try {
      await auth.currentUser.reload();

      if (!auth.currentUser.emailVerified) {
        setUsuario(null);
        setEmailPendiente(auth.currentUser.email || null);
        setPantalla('verificarEmail');
        return;
      }

      const user = auth.currentUser;
      const userRef = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        alert('Tu perfil aun no existe en la base. Intenta salir y entrar de nuevo.');
        return;
      }

      const data = snap.data();

      // Best-effort: marcar email verificado en Firestore.
      try { await updateDoc(doc(db, 'usuarios', user.uid), { emailVerificado: true }); } catch (e) {}

      if (data.aprobado === false) {
        alert('Aun estas pendiente de aprobacion. Si ya avisaste al admin, espera un momento y vuelve a intentar.');
        return;
      }

      const nombreFinal = data.nombre && data.nombre.trim() !== ''
        ? data.nombre
        : user.displayName || user.email?.split('@')[0] || 'Usuario';

      setEmailPendiente(null);
      setUsuario({ ...data, uid: user.uid, nombre: nombreFinal, emailVerificado: true });
      setPantalla(data.rol === 'admin' ? 'admin' : 'feed');
    } catch (e) {
      alert('No se pudo revisar el estado: ' + (e?.message || 'Error'));
    } finally {
      setRevisandoPendiente(false);
    }
  };

  return (
    <div>
      {pantalla === 'login' && (
        <Login onRegister={() => setPantalla('register')} />
      )}
      {pantalla === 'register' && (
        <Register onBack={() => setPantalla('login')} />
      )}
      {pantalla === 'verificarEmail' && (
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'linear-gradient(135deg,#1B2A6B,#0D1533)',flexDirection:'column',gap:'16px',padding:'20px'}}>
          <div style={{background:'white',borderRadius:'24px',padding:'40px',maxWidth:'460px',textAlign:'center',boxShadow:'0 24px 80px rgba(0,0,0,0.4)'}}>
            <h2 style={{color:'#1B2A6B',margin:'0 0 10px'}}>Verifica tu correo</h2>
            <p style={{color:'#666',fontSize:'14px',margin:'0 0 18px',lineHeight:'1.6'}}>
              Para entrar a FJU Cuenca necesitas confirmar tu email.
              {emailPendiente ? (<><br /><strong>{emailPendiente}</strong></>) : null}
            </p>
            <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={handleReenviarVerificacion} style={{padding:'12px 18px',background:'#1B2A6B',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'700'}}>
                Reenviar correo
              </button>
              <button onClick={handleYaVerifique} style={{padding:'12px 18px',background:'white',color:'#1B2A6B',border:'2px solid #1B2A6B',borderRadius:'12px',cursor:'pointer',fontWeight:'700'}}>
                Ya verifique
              </button>
              <button onClick={() => handleAvisarAdmin('No me llega el correo / necesito ayuda para verificar')} style={{padding:'12px 18px',background:'#25D366',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'800'}}>
                Avisar al admin (WhatsApp)
              </button>
              <button onClick={handleLogout} style={{padding:'12px 18px',background:'transparent',color:'#666',border:'2px solid #ddd',borderRadius:'12px',cursor:'pointer',fontWeight:'700'}}>
                Salir
              </button>
            </div>
            <p style={{color:'#aaa',fontSize:'12px',margin:'16px 0 0'}}>
              Si no llega, revisa spam y vuelve a reenviar.
            </p>
          </div>
        </div>
      )}
      {pantalla === 'pendiente' && (
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'linear-gradient(135deg,#1B2A6B,#0D1533)',flexDirection:'column',gap:'16px'}}>
          <div style={{background:'white',borderRadius:'24px',padding:'40px',maxWidth:'400px',textAlign:'center',boxShadow:'0 24px 80px rgba(0,0,0,0.4)'}}>
            <p style={{fontSize:'44px',margin:'0 0 12px',letterSpacing:'2px',fontWeight:'800',color:'#B8860B'}}>PENDIENTE</p>
            <h2 style={{color:'#1B2A6B',margin:'0 0 8px'}}>Cuenta pendiente</h2>
            <p style={{color:'#666',fontSize:'14px',margin:'0 0 20px'}}>Tu cuenta esta siendo revisada por el administrador. Te avisaran pronto.</p>
            <button onClick={handleRevisarAprobacion} disabled={revisandoPendiente} style={{width:'100%',padding:'12px 16px',background:revisandoPendiente?'#888':'#1B2A6B',color:'white',border:'none',borderRadius:'12px',cursor:revisandoPendiente?'not-allowed':'pointer',fontWeight:'800',marginBottom:'10px'}}>
              {revisandoPendiente ? 'Revisando...' : 'Ya me aprobaron (revisar)'}
            </button>
            <button onClick={() => handleAvisarAdmin('Ya verifique mi correo y necesito aprobacion')} style={{width:'100%',padding:'12px 16px',background:'#25D366',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'800',marginBottom:'10px'}}>
              Avisar al admin (WhatsApp)
            </button>
            <button onClick={handleLogout} style={{padding:'12px 24px',background:'#1B2A6B',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'600'}}>
              Volver al inicio
            </button>
          </div>
        </div>
      )}
      {pantalla === 'feed' && usuario && (
        <Feed
          usuario={usuario}
          onLogout={handleLogout}
          onAdmin={(usuario.rol === 'admin' || usuario.rol === 'moderador') ? () => setPantalla('admin') : null}
          onChat={() => setPantalla('chat')}
          onChatPrivado={() => setPantalla('mensajes')}
          onHelp={() => setPantalla('help')}
          onMedias={() => setPantalla('medios')}
          onGroups={() => setPantalla('groups')}
        />
      )}
      {pantalla === 'admin' && usuario && (
        <Admin usuario={usuario} onLogout={handleLogout} onFeed={() => setPantalla('feed')} />
      )}
      {pantalla === 'chat' && usuario && (
        <Chat usuario={usuario} onBack={() => setPantalla('feed')} />
      )}
      {pantalla === 'mensajes' && usuario && (
        <Messenger usuario={usuario} onBack={() => setPantalla('feed')} />
      )}
      {pantalla === 'help' && usuario && (
        <HelpScreen
          onBack={() => setPantalla('feed')}
          onSelectCategory={(cat) => {
            setHelpCategory(cat);
            if (cat === 'resources') {
              setPantalla('helpResources');
            } else {
              setPantalla('helpChat');
            }
          }}
        />
      )}
      {pantalla === 'helpChat' && usuario && (
        <HelpChatScreen
          currentUser={usuario}
          category={helpCategory}
          onBack={() => setPantalla('help')}
        />
      )}
      {pantalla === 'helpResources' && usuario && (
        <ResourcesScreen onBack={() => setPantalla('help')} />
      )}
      {pantalla === 'medios' && usuario && (
        <MediaScreen usuario={usuario} onBack={() => setPantalla('feed')} />
      )}
      {pantalla === 'groups' && usuario && (
        <GroupListScreen
          usuario={usuario}
          onBack={() => setPantalla('feed')}
          onOpenGroup={(id) => {
            setActiveGroupId(id);
            setPantalla('group');
          }}
        />
      )}
      {pantalla === 'group' && usuario && activeGroupId && (
        <GroupScreen
          usuario={usuario}
          groupId={activeGroupId}
          onBack={() => setPantalla('groups')}
        />
      )}
    </div>
  );
}

export default App;
