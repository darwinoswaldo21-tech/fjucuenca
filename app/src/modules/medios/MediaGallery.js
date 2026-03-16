import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, addDoc, deleteDoc } from 'firebase/firestore';
import MediaComments from './MediaComments';

function MediaGallery({ usuario }) {
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [indiceActual, setIndiceActual] = useState(0);
  const [publicando, setPublicando] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) =>
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const visibles = items.filter((f) =>
    f.evento?.toLowerCase().includes(busqueda.toLowerCase()) ||
    f.displayName?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const idx = Math.min(indiceActual, Math.max(0, visibles.length - 1));
  const item = visibles[idx];

  const puedeBorrar = (item) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !item) return false;
    return currentUser.uid === item.uid || usuario?.rol === 'admin';
  };

  const borrarItem = async (item) => {
    if (!window.confirm('¿Seguro que quieres borrar este contenido?')) return;
    try {
      await deleteDoc(doc(db, 'media', item.id));
      setIndiceActual(0);
    } catch (e) {
      alert('Error al borrar');
    }
  };

  const reaccionar = async (itemId, tipo) => {
    const ref = doc(db, 'media', itemId);
    await updateDoc(ref, { [`reacciones.${tipo}`]: increment(1) });
  };

  const publicarEnFeed = async (item) => {
    setPublicando(item.id);
    const currentUser = auth.currentUser;
    try {
      await addDoc(collection(db, 'posts'), {
        texto: `${item.tipo === 'foto' ? '📸' : '🎥'} Compartió ${item.tipo === 'foto' ? 'una foto' : 'un video'} del evento: ${item.evento}`,
        imagen: item.tipo === 'foto' ? item.url : item.thumbnail || null,
        videoId: item.tipo === 'video' ? item.videoId : null,
        videoUrl: item.tipo === 'videoDirecto' ? item.url : null,
        autor: item.displayName,
        autorId: item.uid,
        autorActual: currentUser.uid,
        fecha: new Date().toISOString(),
        aprobado: true,
        likes: 0,
        tipo: item.tipo,
      });
      alert('✅ Publicado en el Feed!');
    } catch (e) {
      alert('Error al publicar en el Feed');
    }
    setPublicando(null);
  };

  const compartir = async (item) => {
    const url = item.tipo === 'video' ? item.urlYoutube : item.url;
    if (navigator.share) {
      await navigator.share({ title: `FJU Cuenca - ${item.evento}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('🔗 Link copiado!');
    }
  };

  const descargar = (item) => {
    if (item.tipo === 'video') {
      window.open(item.urlYoutube, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = item.url;
      a.download = `FJU_${item.evento}.${item.tipo === 'videoDirecto' ? 'mp4' : 'jpg'}`;
      a.target = '_blank';
      a.click();
    }
  };

  const getIcono = (tipo) => {
    if (tipo === 'video') return '▶️';
    if (tipo === 'videoDirecto') return '🎥';
    return '📅';
  };

  const getThumbnail = (item) => {
    if (!item) return '';
    if (item.tipo === 'video') return item.thumbnail || '';
    if (item.tipo === 'videoDirecto') return item.thumbnail || '';
    return item.url || '';
  };

  if (visibles.length === 0) return (
    <div>
      <input
        type="text"
        placeholder="🔍 Buscar por evento o persona..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={estilos.buscador}
      />
      <p style={estilos.vacio}>
        {busqueda ? `No hay resultados para "${busqueda}"` : '¡Sé el primero en subir una foto o video!'}
      </p>
    </div>
  );

  return (
    <div>
      <input
        type="text"
        placeholder="🔍 Buscar por evento o persona..."
        value={busqueda}
        onChange={(e) => { setBusqueda(e.target.value); setIndiceActual(0); }}
        style={estilos.buscador}
      />

      <p style={estilos.contador}>
        {idx + 1} de {visibles.length} {visibles.length === 1 ? 'elemento' : 'elementos'}
      </p>

      {item && (
        <div style={estilos.card}>
          <div style={estilos.cardHeader}>
            <div style={estilos.avatar}>
              {item.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div style={estilos.cardMeta}>
              <div style={estilos.cardNombre}>{item.displayName}</div>
              <div style={estilos.cardFecha}>
                {item.createdAt?.toDate?.()
                  ? new Date(item.createdAt.toDate()).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                  : 'Recién subido'}
              </div>
            </div>
            <div style={estilos.eventoBadge}>
              {getIcono(item.tipo)} {item.evento}
            </div>
            {puedeBorrar(item) && (
              <button
                onClick={() => borrarItem(item)}
                style={estilos.borrarBtn}
              >
                🗑 Borrar
              </button>
            )}
          </div>

          <div style={estilos.cardBody}>
            <div style={estilos.mediaLado}>
              {item.tipo === 'video' && (
                <iframe
                  src={`https://www.youtube.com/embed/${item.videoId}`}
                  title={item.evento}
                  style={estilos.video}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
              {item.tipo === 'videoDirecto' && (
                <video
                  src={item.url}
                  controls
                  style={estilos.video}
                  playsInline
                />
              )}
              {item.tipo === 'foto' && (
                <>
                  <img
                    src={item.url}
                    alt={item.evento}
                    style={estilos.imagen}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div style={estilos.reaccionesOverlay}>
                    {['❤️', '🙌', '🔥'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => reaccionar(item.id, emoji)}
                        style={estilos.reaccionBtn}
                      >
                        {emoji} {item.reacciones?.[emoji] || 0}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => descargar(item)} style={estilos.descargarBtn}>
                    ⬇ Descargar
                  </button>
                </>
              )}
              {(item.tipo === 'video' || item.tipo === 'videoDirecto') && (
                <div style={estilos.reaccionesVideo}>
                  {['❤️', '🙌', '🔥'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => reaccionar(item.id, emoji)}
                      style={estilos.reaccionBtnVideo}
                    >
                      {emoji} {item.reacciones?.[emoji] || 0}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={estilos.comentariosLado}>
              <MediaComments photoId={item.id} />
            </div>
          </div>

          <div style={estilos.cardFooter}>
            <div style={estilos.stat}>
              ❤️ {(item.reacciones?.['❤️'] || 0) + (item.reacciones?.['🙌'] || 0) + (item.reacciones?.['🔥'] || 0)} reacciones
            </div>
            <button onClick={() => compartir(item)} style={estilos.footerBtn}>🔗 Compartir</button>
            <button
              onClick={() => publicarEnFeed(item)}
              disabled={publicando === item.id}
              style={estilos.feedBtn}
            >
              {publicando === item.id ? 'Publicando...' : '📢 Publicar en Feed'}
            </button>
            <div style={estilos.navBtns}>
              <button
                onClick={() => setIndiceActual(Math.max(0, idx - 1))}
                disabled={idx === 0}
                style={estilos.navBtn}
              >← Anterior</button>
              <button
                onClick={() => setIndiceActual(Math.min(visibles.length - 1, idx + 1))}
                disabled={idx === visibles.length - 1}
                style={estilos.navBtn}
              >Siguiente →</button>
            </div>
          </div>
        </div>
      )}

      <div style={estilos.miniaturas}>
        {visibles.map((f, i) => (
          <div
            key={f.id}
            onClick={() => setIndiceActual(i)}
            style={{
              ...estilos.miniatura,
              border: i === idx ? '3px solid #1B2A6B' : '2px solid transparent'
            }}
          >
            {getThumbnail(f) ? (
              <img
                src={getThumbnail(f)}
                alt={f.evento}
                style={estilos.miniaturaImg}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div style={estilos.miniaturaPlaceholder}>
                {f.tipo === 'videoDirecto' ? '🎥' : '▶️'}
              </div>
            )}
            {(f.tipo === 'video' || f.tipo === 'videoDirecto') && (
              <div style={estilos.videoIcono}>▶</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const estilos = {
  buscador: { width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #ddd', fontSize: 15, marginBottom: 12, boxSizing: 'border-box', outline: 'none' },
  contador: { color: '#888', fontSize: 13, marginBottom: 12, textAlign: 'right' },
  vacio: { textAlign: 'center', color: '#aaa', padding: 40, fontSize: 15 },
  card: { background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', marginBottom: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' },
  avatar: { width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1B2A6B,#3d5a99)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0 },
  cardMeta: { flex: 1 },
  cardNombre: { fontSize: 14, fontWeight: 700, color: '#1B2A6B' },
  cardFecha: { fontSize: 11, color: '#aaa' },
  eventoBadge: { background: '#EEF1FF', color: '#1B2A6B', fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 600 },
  borrarBtn: { background: '#fee2e2', border: 'none', borderRadius: 8, padding: '4px 12px', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  cardBody: { display: 'flex' },
  mediaLado: { width: '55%', position: 'relative' },
  imagen: { width: '100%', height: 280, objectFit: 'cover', display: 'block' },
  video: { width: '100%', height: 280, display: 'block', border: 'none' },
  reaccionesOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.5))', padding: '24px 10px 8px', display: 'flex', gap: 6 },
  reaccionBtn: { background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 20, padding: '4px 10px', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  reaccionesVideo: { display: 'flex', gap: 6, padding: '8px 10px', background: '#f8f9ff' },
  reaccionBtnVideo: { background: '#EEF1FF', border: 'none', borderRadius: 20, padding: '4px 10px', color: '#1B2A6B', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  descargarBtn: { position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 8, padding: '5px 10px', color: 'white', fontSize: 12, cursor: 'pointer' },
  comentariosLado: { flex: 1, borderLeft: '1px solid #f0f0f0', overflow: 'hidden' },
  cardFooter: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderTop: '1px solid #f5f5f5', flexWrap: 'wrap' },
  stat: { fontSize: 12, color: '#888', marginRight: 4 },
  footerBtn: { background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: '#555' },
  feedBtn: { background: '#1B2A6B', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: 'white', fontWeight: 600 },
  navBtns: { display: 'flex', gap: 6, marginLeft: 'auto' },
  navBtn: { background: '#f0f2f5', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: '#555' },
  miniaturas: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 },
  miniatura: { flexShrink: 0, width: 64, height: 64, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', position: 'relative', background: '#f0f2f5' },
  miniaturaImg: { width: '100%', height: '100%', objectFit: 'cover' },
  miniaturaPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: '#EEF1FF' },
  videoIcono: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 },
};

export default MediaGallery;