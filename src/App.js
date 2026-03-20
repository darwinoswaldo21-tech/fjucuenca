import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Refrescar emailVerified (best-effort).
          try { await user.reload(); } catch (e) {}

          // Si el correo no esta verificado, no permitimos entrar.
          // El Login muestra el mensaje; aqui solo aseguramos que no quede una sesion a medias.
          if (user.emailVerified === false) {
            try { await signOut(auth); } catch (e) {}
            setUsuario(null);
            setPantalla('login');
            return;
          }

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
              fechaRegistro: new Date().toISOString(),
            }, { merge: true });

            setUsuario(null);
            setPantalla('pendiente');
          }
      } else {
        setUsuario(null);
        setPantalla('login');
      }
      } catch (e) {
        console.log('Error cargando usuario:', e);
        setUsuario(null);
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
    setPantalla('login');
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
      {pantalla === 'pendiente' && (
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'linear-gradient(135deg,#1B2A6B,#0D1533)',flexDirection:'column',gap:'16px'}}>
          <div style={{background:'white',borderRadius:'24px',padding:'40px',maxWidth:'400px',textAlign:'center',boxShadow:'0 24px 80px rgba(0,0,0,0.4)'}}>
            <p style={{fontSize:'44px',margin:'0 0 12px',letterSpacing:'2px',fontWeight:'800',color:'#B8860B'}}>PENDIENTE</p>
            <h2 style={{color:'#1B2A6B',margin:'0 0 8px'}}>Cuenta pendiente</h2>
            <p style={{color:'#666',fontSize:'14px',margin:'0 0 20px'}}>Falta que el admin apruebe tu cuenta para que puedas ingresar.</p>
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
