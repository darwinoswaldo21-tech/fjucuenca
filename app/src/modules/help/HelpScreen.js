import React from 'react';
import { HELP_CATEGORIES } from './helpConfig';

export default function HelpScreen({ onBack, onSelectCategory }) {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 480, margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', marginBottom: 16 }}
      >
        ←
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
        ¿Cómo podemos ayudarte?
      </h2>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
        Selecciona una categoría para conectarte con alguien de confianza.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {HELP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 20px',
              borderRadius: 14,
              border: `1.5px solid ${cat.color}44`,
              background: `${cat.color}11`,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span style={{ fontSize: 28 }}>{cat.icon}</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, margin: 0, color: cat.color }}>
                {cat.label}
              </p>
              <p style={{ fontSize: 13, color: '#777', margin: '2px 0 0' }}>
                {cat.description}
              </p>
            </div>
            <span style={{ marginLeft: 'auto', color: cat.color, fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}