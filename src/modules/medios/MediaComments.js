import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDoc, doc } from 'firebase/firestore';

function MediaComments({ photoId }) {
  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'media', photoId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) =>
      setComentarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [photoId]);

  const enviar = async () => {
    if (!texto.trim()) return;
    const usuario = auth.currentUser;

    let nombreReal = usuario.displayName;
    if (!nombreReal) {
      const snap = await getDoc(doc(db, 'usuarios', usuario.uid));
      if (snap.exists()) nombreReal = snap.data().nombre;
    }
    nombreReal = nombreReal || usuario.email?.split('@')[0] || 'Usuario';

    await addDoc(collection(db, 'media', photoId, 'comments'), {
      texto: texto.trim(),
      uid: usuario.uid,
      displayName: nombreReal,
      createdAt: serverTimestamp(),
    });
    setTexto('');
  };

  return (
    <div style={estilos.contenedor}>
      <h4 style={estilos.titulo}>💬 Comentarios</h4>
      <div style={estilos.lista}>
        {comentarios.length === 0 && (
          <p style={estilos.vacio}>Sé el primero en comentar</p>
        )}
        {comentarios.map((c) => (
          <div key={c.id} style={estilos.comentario}>
            <div style={estilos.avatarPeq}>
              {c.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div style={estilos.comentarioTexto}>
              <strong style={estilos.nombre}>{c.displayName}</strong>
              <span style={estilos.texto}> {c.texto}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={estilos.inputFila}>
        <input
          type="text"
          placeholder="Escribe un comentario..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          style={estilos.input}
        />
        <button onClick={enviar} style={estilos.boton}>Enviar</button>
      </div>
    </div>
  );
}

const estilos = {
  contenedor: { marginTop: 0, padding: 12, height: '100%', display: 'flex', flexDirection: 'column' },
  titulo: { color: '#9d174d', marginBottom: 10, fontSize: 15 },
  lista: { flex: 1, maxHeight: 180, overflowY: 'auto', marginBottom: 10 },
  vacio: { color: '#aaa', fontSize: 13, textAlign: 'center', padding: 8 },
  comentario: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  avatarPeq: { width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#b1125a,#e04386)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0 },
  comentarioTexto: { background: '#f5f5f5', borderRadius: 10, padding: '6px 10px', fontSize: 13, flex: 1 },
  nombre: { color: '#9d174d', fontSize: 13 },
  texto: { color: '#333', fontSize: 13 },
  inputFila: { display: 'flex', gap: 8 },
  input: { flex: 1, border: '1px solid #ddd', borderRadius: 20, padding: '7px 12px', fontSize: 13, outline: 'none' },
  boton: { background: '#9d174d', border: 'none', borderRadius: 20, padding: '7px 16px', color: 'white', fontSize: 13, cursor: 'pointer' },
};

export default MediaComments;
