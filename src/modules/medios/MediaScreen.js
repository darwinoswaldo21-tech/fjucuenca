import React, { useState } from 'react';
import MediaUpload from './MediaUpload';
import MediaGallery from './MediaGallery';

function MediaScreen({ usuario, onBack }) {
  const [mostrarSubir, setMostrarSubir] = useState(false);

  return (
    <div style={estilos.contenedor}>
      {/* Header */}
      <div style={estilos.header}>
        <button onClick={onBack} style={estilos.botonBack}>← Volver</button>
        <h2 style={estilos.titulo}>📸 Medios</h2>
        <button
          onClick={() => setMostrarSubir(!mostrarSubir)}
          style={estilos.botonSubir}
        >
          {mostrarSubir ? 'Cancelar' : '+ Subir foto'}
        </button>
      </div>

      {/* Formulario de subida */}
      {mostrarSubir && (
        <MediaUpload onUploaded={() => setMostrarSubir(false)} />
      )}

      {/* Galería */}
      <MediaGallery />
    </div>
  );
}

const estilos = {
  contenedor: {
    minHeight: '100vh',
    background: '#f4f6fb',
    padding: 16,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    background: '#1B2A6B',
    borderRadius: 12,
    padding: '12px 16px',
  },
  titulo: {
    color: '#fff',
    fontSize: 20,
    margin: 0,
  },
  botonBack: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.4)',
    color: '#fff',
    borderRadius: 8,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 14,
  },
  botonSubir: {
    background: '#F5A623',
    border: 'none',
    color: '#fff',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 'bold',
  },
};

export default MediaScreen;