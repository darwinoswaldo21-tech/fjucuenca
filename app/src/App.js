import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Login from './Login';
import Register from './Register';
import Feed from './Feed';
import Admin from './Admin';
import Chat from './Chat';

function App() {
  const [pantalla, setPantalla] = useState('login');
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUsuario({...data, uid: user.uid});
          if (data.rol === 'admin') {
            setPantalla('admin');
          } else {
            setPantalla('feed');
          }
        }
      } else {
        setUsuario(null);
        setPantalla('login');
      }
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setPantalla('login');
  };

  return (
    <div>
      {pantalla === 'login' && (
        <Login onRegister={() => setPantalla('register')} />
      )}
      {pantalla === 'register' && (
        <Register onBack={() => setPantalla('login')} />
      )}
      {pantalla === 'feed' && usuario && (
        <Feed usuario={usuario} onLogout={handleLogout} onAdmin={usuario.rol==='admin'?()=>setPantalla('admin'):null} onChat={()=>setPantalla('chat')} />
      )}
      {pantalla === 'admin' && usuario && (
        <Admin usuario={usuario} onLogout={handleLogout} onFeed={()=>setPantalla('feed')} />
      )}
      {pantalla === 'chat' && usuario && (
        <Chat usuario={usuario} onBack={()=>setPantalla('feed')} />
      )}
    </div>
  );
}

export default App;