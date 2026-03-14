import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

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
    await addDoc(collection(db, 'media', photoId, 'comments'), {
      texto: texto.trim(),
      uid: usuario.uid,
      displayName: usuario.displayName || 'Usuario',
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
            <strong style={estilos.nombre}>{c.displayName}</strong>
            <span style={estilos.texto}>{c.texto}</span>
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
  contenedor: { marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 },
  titulo: { color: '#1B2A6B', marginBottom: 10, fontSize: 15 },
  lista: { maxHeight: 200, overflowY: 'auto', marginBottom: 10 },
  vacio: { color: '#aaa', fontSize: 13, textAlign: 'center', padding: 8 },
  comentario: { marginBottom: 8, fontSize: 14 },
  nombre: { color: '#1B2A6B', marginRight: 6 },
  texto: { color: '#333' },
  inputFila: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  boton: { background: '#1B2A6B', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14 },
};

export default MediaComments;