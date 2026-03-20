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
  const [revisandoAprobacion, setRevisandoAprobacion] = useState(false);
  const [emailPendiente, setEmailPendiente] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Refrescar emailVerified (best-effort).
          try { await user.reload(); } catch (e) {}

          const userRef = doc(db, 'usuarios', user.uid);
          let snap = await getDoc(userRef);
          let data = null;

          if (!snap.exists()) {
            // Caso comun: existe un doc legacy (por ejemplo por nombre). Intentamos migrar por email.
            const email = user.email || null;

            const tryLegacyMatch = async (field, value) => {
              if (!value) return null;
              const q = query(collection(db, 'usuarios'), where(field, '==', value), limit(1));
              const qs = await getDocs(q);
              if (qs.empty) return null;
              return qs.docs[0];
            };

            // 1) Por email (si existe en Firestore)
            let legacyDoc = await tryLegacyMatch('email', email);

            if (legacyDoc) {
              data = legacyDoc.data();

              // Creamos/normalizamos el doc por UID sin borrar el legacy (evita perdida de datos).
              await setDoc(userRef, { ...data, ...(email ? { email } : {}) }, { merge: true });
              snap = await getDoc(userRef);
            }
          }

          if (snap.exists()) {
            data = snap.data();

            // 1) Exigir verificacion de email antes de permitir cualquier acceso.
            if (!user.emailVerified) {
              setUsuario(null);
              setEmailPendiente(user.email || null);
              setPantalla('verificarEmail');
              return;
            }

            // Marcar en Firestore que ya esta verificado (solo informativo).
            if (data.emailVerificado !== true) {
              try { await updateDoc(doc(db, 'usuarios', user.uid), { emailVerificado: true }); } catch (e) {}
            }

            // Verificar aprobado (solo entra si aprobado === true)
            if (data.aprobado !== true) {
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

  const handleReenviarVerificacion = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      alert('Listo! Te enviamos un correo de verificacion. Revisa spam.');
    } catch (e) {
      alert('No se pudo enviar el correo: ' + (e?.message || 'Error'));
    }
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
      // Re-evaluar aprobado
      await handleRevisarAprobacion();
    } catch (e) {
      alert('No se pudo verificar el estado: ' + (e?.message || 'Error'));
    }
  };

  const handleRevisarAprobacion = async () => {
    if (!auth.currentUser) return;
    if (revisandoAprobacion) return;

    setRevisandoAprobacion(true);
    try {
      const user = auth.currentUser;

      // Si aun no verifico email, mandarlo a esa pantalla.
      try { await user.reload(); } catch (e) {}
      if (!user.emailVerified) {
        setUsuario(null);
        setEmailPendiente(user.email || null);
        setPantalla('verificarEmail');
        return;
      }

      const userRef = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        alert('Tu perfil aun no existe. Intenta salir y entrar de nuevo.');
        return;
      }

      const data = snap.data();
      if (data.aprobado !== true) {
        alert('Aun estas pendiente. Pidele al admin que te apruebe.');
        return;
      }

      const nombreFinal = data.nombre && data.nombre.trim() !== ''
        ? data.nombre
        : user.displayName || user.email?.split('@')[0] || 'Usuario';

      if (!data.nombre || data.nombre.trim() === '') {
        try {
          await updateDoc(doc(db, 'usuarios', user.uid), { nombre: nombreFinal });
        } catch (e) {}
      }

      setUsuario({ ...data, uid: user.uid, nombre: nombreFinal });
      setPantalla(data.rol === 'admin' ? 'admin' : 'feed');
    } catch (e) {
      alert('No se pudo revisar: ' + (e?.message || 'Error'));
    } finally {
      setRevisandoAprobacion(false);
    }
  };

  if (cargando) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'#1B2A6B',color:'white',fontSize:'18px'}}>
      Cargando FJU...
    </div>
  );

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
            <p style={{fontSize:'44px',margin:'0 0 12px',letterSpacing:'2px',fontWeight:'800',color:'#B8860B'}}>EMAIL</p>
            <h2 style={{color:'#1B2A6B',margin:'0 0 8px'}}>Verifica tu correo</h2>
            <p style={{color:'#666',fontSize:'14px',margin:'0 0 20px',lineHeight:'1.6'}}>
              Te enviamos un correo de verificacion.
              {emailPendiente ? (<><br /><strong>{emailPendiente}</strong></>) : null}
            </p>
            <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={handleReenviarVerificacion} style={{padding:'12px 18px',background:'#1B2A6B',color:'white',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:'800'}}>
                Reenviar correo
              </button>
              <button onClick={handleYaVerifique} style={{padding:'12px 18px',background:'white',color:'#1B2A6B',border:'2px solid #1B2A6B',borderRadius:'12px',cursor:'pointer',fontWeight:'800'}}>
                Ya verifique
              </button>
              <button onClick={handleLogout} style={{padding:'12px 18px',background:'transparent',color:'#666',border:'2px solid #ddd',borderRadius:'12px',cursor:'pointer',fontWeight:'800'}}>
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
      {pantalla === 'pendiente' && (
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'linear-gradient(135deg,#1B2A6B,#0D1533)',flexDirection:'column',gap:'16px'}}>
          <div style={{background:'white',borderRadius:'24px',padding:'40px',maxWidth:'400px',textAlign:'center',boxShadow:'0 24px 80px rgba(0,0,0,0.4)'}}>
            <p style={{fontSize:'44px',margin:'0 0 12px',letterSpacing:'2px',fontWeight:'800',color:'#B8860B'}}>PENDIENTE</p>
            <h2 style={{color:'#1B2A6B',margin:'0 0 8px'}}>Cuenta pendiente</h2>
            <p style={{color:'#666',fontSize:'14px',margin:'0 0 20px'}}>Tu cuenta esta siendo revisada por el administrador. Te avisaran pronto.</p>
            <button onClick={handleRevisarAprobacion} disabled={revisandoAprobacion} style={{width:'100%',padding:'12px 16px',background:revisandoAprobacion?'#888':'#1B2A6B',color:'white',border:'none',borderRadius:'12px',cursor:revisandoAprobacion?'not-allowed':'pointer',fontWeight:'800',marginBottom:'10px'}}>
              {revisandoAprobacion ? 'Revisando...' : 'Ya me aprobaron (revisar)'}
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
          onAdmin={usuario.rol === 'admin' ? () => setPantalla('admin') : null}
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
