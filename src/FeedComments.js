import React, { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from 'firebase/firestore';

function FeedComments({ postId, postAuthorId, postText }) {
  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [nombreReal, setNombreReal] = useState('');

  // FIX: cargar nombre real desde Firestore al montar
  useEffect(() => {
    const cargarNombre = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const nombre = data.nombre && data.nombre.trim() !== ''
            ? data.nombre
            : user.displayName || user.email?.split('@')[0] || 'Usuario';
          setNombreReal(nombre);
        }
      } catch (e) {
        setNombreReal(user.displayName || user.email?.split('@')[0] || 'Usuario');
      }
    };
    cargarNombre();
  }, []);

  useEffect(() => {
    if (!mostrar) return;
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) =>
      setComentarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, [postId, mostrar]);

  const enviar = async () => {
    if (!texto.trim()) return;
    const usuario = auth.currentUser;
    // FIX: usar nombreReal cargado desde Firestore
    const nombre = nombreReal || usuario.displayName || usuario.email?.split('@')[0] || 'Usuario';
    const msg = texto.trim();

    await addDoc(collection(db, 'posts', postId, 'comments'), {
      texto: texto.trim(),
      uid: usuario.uid,
      displayName: nombre,
      createdAt: serverTimestamp(),
    });

    // Notificacion in-app: si comentas un post de otra persona, avisamos al autor.
    // Nota: esto es MVP (cliente). A futuro lo ideal es hacerlo con Cloud Functions.
    try {
      if (postAuthorId && postAuthorId !== usuario.uid) {
        await addDoc(collection(db, 'notifications', postAuthorId, 'items'), {
          type: 'comment',
          read: false,
          createdAt: serverTimestamp(),
          fromUid: usuario.uid,
          fromName: nombre,
          postId,
          title: 'Nuevo comentario',
          body: `${nombre}: ${msg.slice(0, 140)}`,
          postText: (postText || '').slice(0, 140),
        });
      }
    } catch (e) {
      // Best-effort: el comentario no debe fallar si la notificacion falla.
    }
    setTexto('');
  };

  return (
    <div style={estilos.contenedor}>
      <button
        onClick={() => setMostrar(!mostrar)}
        style={estilos.toggleBtn}
      >
        💬 {mostrar ? 'Ocultar comentarios' : 'Comentar'}
      </button>

      {mostrar && (
        <div style={estilos.seccion}>
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
      )}
    </div>
  );
}

const estilos = {
  contenedor: { marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 10 },
  toggleBtn: { background: 'none', border: 'none', color: '#9d174d', fontSize: 13, cursor: 'pointer', fontWeight: 600, padding: 0 },
  seccion: { marginTop: 10 },
  lista: { maxHeight: 200, overflowY: 'auto', marginBottom: 10 },
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

export default FeedComments;

