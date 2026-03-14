import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Login from './Login';
import Register from './Register';
import Feed from './Feed';
import Admin from './Admin';
import Chat from './Chat';
import ChatPrivado from './ChatPrivado';
import HelpScreen from './modules/help/HelpScreen';
import HelpChatScreen from './modules/help/HelpChatScreen';
import ResourcesScreen from './modules/help/ResourcesScreen';
import MediaScreen from './modules/medios/MediaScreen';

function App() {
  const [pantalla, setPantalla] = useState('login');
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [helpCategory, setHelpCategory] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUsuario({...data, uid: user.uid});
          setPantalla(prev => {
            if (prev === 'login' || prev === 'register') {
              return data.rol === 'admin' ? 'admin' : 'feed';
            }
            return prev;
          });
        }
      } else {
        setUsuario(null);
        setPantalla('login');
      }
      setCargando(false);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setPantalla('login');
  };

  if (cargando) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'#1B2A6B',color:'white',fontSize:'18px'}}>
      ✝️ Cargando FJU...
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
      {pantalla === 'feed' && usuario && (
        <Feed
          usuario={usuario}
          onLogout={handleLogout}
          onAdmin={usuario.rol === 'admin' ? () => setPantalla('admin') : null}
          onChat={() => setPantalla('chat')}
          onChatPrivado={() => setPantalla('chatPrivado')}
          onHelp={() => setPantalla('help')}
          onMedias={() => setPantalla('medios')}
        />
      )}
      {pantalla === 'admin' && usuario && (
        <Admin usuario={usuario} onLogout={handleLogout} onFeed={() => setPantalla('feed')} />
      )}
      {pantalla === 'chat' && usuario && (
        <Chat usuario={usuario} onBack={() => setPantalla('feed')} />
      )}
      {pantalla === 'chatPrivado' && usuario && (
        <ChatPrivado usuario={usuario} onBack={() => setPantalla('feed')} />
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
    </div>
  );
}

export default App;