import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ResourcesScreen({ onBack }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      const snap = await getDocs(collection(db, 'resources'));
      setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchResources();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>
        Cargando recursos...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 480, margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', marginBottom: 16 }}
      >
        ←
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
        Recursos Espirituales
      </h2>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
        Materiales para tu crecimiento espiritual.
      </p>

      {resources.length === 0 && (
        <p style={{ color: '#bbb', textAlign: 'center', marginTop: 40 }}>
          No hay recursos disponibles aún.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {resources.map((res) => (
          
            key={res.id}
            href={res.url}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '16px 20px',
              borderRadius: 14,
              border: '1.5px solid #4A7FC122',
              background: '#4A7FC111',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#4A7FC1' }}>
              {res.title}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>
              {res.type}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}