import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

function App() {
  const [pantalla, setPantalla] = useState('login');

  return (
    <div>
      {pantalla === 'login' && (
        <Login onRegister={() => setPantalla('register')} />
      )}
      {pantalla === 'register' && (
        <Register onBack={() => setPantalla('login')} />
      )}
    </div>
  );
}

export default App;