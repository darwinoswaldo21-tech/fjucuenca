import React, { useState } from 'react';
import { auth, db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const CLOUD_NAME = 'drous3rse';
const UPLOAD_PRESET = 'fju_media';
const MAX_VIDEO_MB = 100;

function extraerIdYoutube(url) {
  const regExp = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function MediaUpload({ onUploaded, usuario }) {
  const [tipo, setTipo] = useState('foto');
  const [archivo, setArchivo] = useState(null);
  const [archivoVideo, setArchivoVideo] = useState(null);
  const [urlYoutube, setUrlYoutube] = useState('');
  const [evento, setEvento] = useState('');
  const [progreso, setProgreso] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const getNombre = () => {
    return auth.currentUser?.displayName ||
      usuario?.nombre ||
      auth.currentUser?.email?.split('@')[0] ||
      'Usuario';
  };

  const handleSubirFoto = async () => {
    if (!archivo || !evento.trim()) {
      setError('Por favor selecciona una foto y escribe el nombre del evento.');
      return;
    }
    setError('');
    setSubiendo(true);

    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'fju_medios');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgreso(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = async () => {
      const data = JSON.parse(xhr.responseText);
      await addDoc(collection(db, 'media'), {
        tipo: 'foto',
        url: data.secure_url,
        evento: evento.trim(),
        uid: auth.currentUser.uid,
        displayName: getNombre(),
        photoURL: auth.currentUser.photoURL || null,
        createdAt: serverTimestamp(),
      });
      setArchivo(null);
      setEvento('');
      setProgreso(0);
      setSubiendo(false);
      document.getElementById('input-foto').value = '';
      onUploaded?.();
    };

    xhr.onerror = () => {
      setError('Error al subir la foto. Intenta de nuevo.');
      setSubiendo(false);
    };

    xhr.send(formData);
  };

  const handleSeleccionarVideo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_VIDEO_MB) {
      setError(`El video pesa ${mb.toFixed(1)}MB. El límite es ${MAX_VIDEO_MB}MB. Para videos más largos usa la opción YouTube.`);
      setArchivoVideo(null);
      e.target.value = '';
      return;
    }
    setError('');
    setArchivoVideo(file);
  };

  const handleSubirVideoDirecto = async () => {
    if (!archivoVideo || !evento.trim()) {
      setError('Por favor selecciona un video y escribe el nombre del evento.');
      return;
    }
    setError('');
    setSubiendo(true);

    const formData = new FormData();
    formData.append('file', archivoVideo);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'fju_videos');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgreso(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = async () => {
      const data = JSON.parse(xhr.responseText);
      await addDoc(collection(db, 'media'), {
        tipo: 'videoDirecto',
        url: data.secure_url,
        thumbnail: data.secure_url.replace('/upload/', '/upload/so_0/').replace(/\.\w+$/, '.jpg'),
        evento: evento.trim(),
        uid: auth.currentUser.uid,
        displayName: getNombre(),
        photoURL: auth.currentUser.photoURL || null,
        createdAt: serverTimestamp(),
      });
      setArchivoVideo(null);
      setEvento('');
      setProgreso(0);
      setSubiendo(false);
      document.getElementById('input-video').value = '';
      onUploaded?.();
    };

    xhr.onerror = () => {
      setError('Error al subir el video. Intenta de nuevo.');
      setSubiendo(false);
    };

    xhr.send(formData);
  };

  const handleSubirVideoYoutube = async () => {
    if (!urlYoutube.trim() || !evento.trim()) {
      setError('Por favor pega el link de YouTube y escribe el nombre del evento.');
      return;
    }
    const videoId = extraerIdYoutube(urlYoutube);
    if (!videoId) {
      setError('El link de YouTube no es válido. Ejemplo: https://youtu.be/xxxxx');
      return;
    }
    setError('');
    setSubiendo(true);
    await addDoc(collection(db, 'media'), {
      tipo: 'video',
      videoId,
      urlYoutube: urlYoutube.trim(),
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      evento: evento.trim(),
      uid: auth.currentUser.uid,
      displayName: getNombre(),
      photoURL: auth.currentUser.photoURL || null,
      createdAt: serverTimestamp(),
    });
    setUrlYoutube('');
    setEvento('');
    setSubiendo(false);
    onUploaded?.();
  };

  return (
    <div style={estilos.contenedor}>
      <h3 style={estilos.titulo}>Subir contenido</h3>

      {/* Selector tipo */}
      <div style={estilos.tipoRow}>
        <button onClick={() => { setTipo('foto'); setError(''); }} style={tipo === 'foto' ? estilos.tipoActivo : estilos.tipoBtn}>
          📸 Foto
        </button>
        <button onClick={() => { setTipo('videoDirecto'); setError(''); }} style={tipo === 'videoDirecto' ? estilos.tipoActivo : estilos.tipoBtn}>
          🎥 Video corto
        </button>
        <button onClick={() => { setTipo('video'); setError(''); }} style={tipo === 'video' ? estilos.tipoActivo : estilos.tipoBtn}>
          ▶️ YouTube
        </button>
      </div>

      {/* Foto */}
      {tipo === 'foto' && (
        <>
          <input
            id="input-foto"
            type="file"
            accept="image/*"
            onChange={(e) => setArchivo(e.target.files[0])}
            style={estilos.inputArchivo}
          />
          <input
            type="text"
            placeholder="Nombre del evento (ej: Campamento 2025)"
            value={evento}
            onChange={(e) => setEvento(e.target.value)}
            style={estilos.inputTexto}
          />
          {subiendo && (
            <div style={estilos.progresoContenedor}>
              <div style={{ ...estilos.progresoBarra, width: `${progreso}%` }} />
              <span style={estilos.progresoTexto}>{progreso}%</span>
            </div>
          )}
          {error && <p style={estilos.error}>{error}</p>}
          <button
            onClick={handleSubirFoto}
            disabled={subiendo || !archivo || !evento.trim()}
            style={subiendo || !archivo || !evento.trim() ? estilos.botonDesactivado : estilos.boton}
          >
            {subiendo ? `Subiendo ${progreso}%...` : 'Subir foto'}
          </button>
        </>
      )}

      {/* Video directo */}
      {tipo === 'videoDirecto' && (
        <>
          <div style={estilos.instrucciones}>
            <p style={estilos.instruccionTitulo}>🎥 Video directo — máximo {MAX_VIDEO_MB}MB</p>
            <p style={estilos.instruccionTexto}>Para clips y momentos del evento</p>
            <p style={estilos.instruccionTexto}>Para videos muy largos usa la opción ▶️ YouTube</p>
          </div>
          <input
            id="input-video"
            type="file"
            accept="video/*"
            onChange={handleSeleccionarVideo}
            style={estilos.inputArchivo}
          />
          {archivoVideo && (
            <p style={estilos.pesoTexto}>
              ✅ {archivoVideo.name} — {(archivoVideo.size / (1024 * 1024)).toFixed(1)}MB
            </p>
          )}
          <input
            type="text"
            placeholder="Nombre del evento (ej: Retiro Jóvenes 2025)"
            value={evento}
            onChange={(e) => setEvento(e.target.value)}
            style={estilos.inputTexto}
          />
          {subiendo && (
            <div style={estilos.progresoContenedor}>
              <div style={{ ...estilos.progresoBarra, width: `${progreso}%` }} />
              <span style={estilos.progresoTexto}>{progreso}%</span>
            </div>
          )}
          {error && <p style={estilos.error}>{error}</p>}
          <button
            onClick={handleSubirVideoDirecto}
            disabled={subiendo || !archivoVideo || !evento.trim()}
            style={subiendo || !archivoVideo || !evento.trim() ? estilos.botonDesactivado : estilos.boton}
          >
            {subiendo ? `Subiendo ${progreso}%...` : 'Subir video'}
          </button>
        </>
      )}

      {/* YouTube */}
      {tipo === 'video' && (
        <>
          <div style={estilos.instrucciones}>
            <p style={estilos.instruccionTitulo}>▶️ Cómo subir un video largo</p>
            <p style={estilos.instruccionTexto}>1. Sube tu video a YouTube</p>
            <p style={estilos.instruccionTexto}>2. En visibilidad elige <strong>"No listado"</strong></p>
            <p style={estilos.instruccionTexto}>3. Copia el link y pégalo aquí</p>
          </div>
          <input
            type="text"
            placeholder="https://youtu.be/xxxxxxxxxx"
            value={urlYoutube}
            onChange={(e) => setUrlYoutube(e.target.value)}
            style={estilos.inputTexto}
          />
          <input
            type="text"
            placeholder="Nombre del evento (ej: Culto Domingo 2025)"
            value={evento}
            onChange={(e) => setEvento(e.target.value)}
            style={estilos.inputTexto}
          />
          {error && <p style={estilos.error}>{error}</p>}
          <button
            onClick={handleSubirVideoYoutube}
            disabled={subiendo || !urlYoutube.trim() || !evento.trim()}
            style={subiendo || !urlYoutube.trim() || !evento.trim() ? estilos.botonDesactivado : estilos.boton}
          >
            {subiendo ? 'Guardando...' : 'Agregar video'}
          </button>
        </>
      )}
    </div>
  );
}

const estilos = {
  contenedor: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  titulo: { color: '#1B2A6B', marginBottom: 16, fontSize: 18 },
  tipoRow: { display: 'flex', gap: 8, marginBottom: 16 },
  tipoBtn: { flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 13, color: '#555' },
  tipoActivo: { flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #1B2A6B', background: '#EEF1FF', cursor: 'pointer', fontSize: 13, color: '#1B2A6B', fontWeight: 700 },
  inputArchivo: { display: 'block', marginBottom: 12, width: '100%' },
  inputTexto: { display: 'block', width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 12, fontSize: 15, boxSizing: 'border-box' },
  instrucciones: { background: '#f8f9ff', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #e0e4ff' },
  instruccionTitulo: { color: '#1B2A6B', fontWeight: 700, fontSize: 13, marginBottom: 6 },
  instruccionTexto: { color: '#555', fontSize: 13, marginBottom: 4 },
  pesoTexto: { color: '#1B2A6B', fontSize: 13, marginBottom: 8, fontWeight: 600 },
  progresoContenedor: { background: '#eee', borderRadius: 8, height: 10, marginBottom: 12, position: 'relative', overflow: 'hidden' },
  progresoBarra: { background: '#1B2A6B', height: '100%', borderRadius: 8, transition: 'width 0.3s' },
  progresoTexto: { position: 'absolute', right: 8, top: -4, fontSize: 11, color: '#555' },
  error: { color: 'red', fontSize: 13, marginBottom: 8 },
  boton: { background: '#1B2A6B', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 15, cursor: 'pointer', width: '100%' },
  botonDesactivado: { background: '#aaa', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 15, cursor: 'not-allowed', width: '100%' },
};

export default MediaUpload;