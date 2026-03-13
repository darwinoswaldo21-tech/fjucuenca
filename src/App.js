import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Login from './Login';
import Register from './Register';
import Feed from './Feed';

function App() {
  const [pantalla, setPantalla] = useState('login');
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists()) {
          setUsuario({...snap.data(), uid: user.uid});
          setPantalla('feed');
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
        <Feed usuario={usuario} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;