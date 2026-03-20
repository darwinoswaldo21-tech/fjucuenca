import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from './firebase';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';

function Admin({ usuario, onLogout, onFeed }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState(null);

  const canManageUsers = usuario?.rol === 'admin';

  const mostrarNotif = useCallback((msg, tipo) => {
    setNotif({ msg, tipo });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      mostrarNotif('No se pudo cargar usuarios: ' + (e?.message || 'Error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [mostrarNotif]);

  useEffect(() => {
    if (canManageUsers) cargarUsuarios();
  }, [canManageUsers, cargarUsuarios]);

  const aprobarUsuario = async (id) => {
    if (!canManageUsers) return;
    try {
      await updateDoc(doc(db, 'usuarios', id), { aprobado: true });
      mostrarNotif('Usuario aprobado', 'exito');
      cargarUsuarios();
    } catch (e) {
      mostrarNotif('No se pudo aprobar: ' + (e?.message || 'Error'), 'error');
    }
  };

  const cambiarRol = async (id, rol) => {
    if (!canManageUsers) return;
    try {
      await updateDoc(doc(db, 'usuarios', id), { rol });
      mostrarNotif('Rol actualizado', 'exito');
      cargarUsuarios();
    } catch (e) {
      mostrarNotif('No se pudo cambiar rol: ' + (e?.message || 'Error'), 'error');
    }
  };

  const usuariosOrdenados = useMemo(() => {
    const arr = [...usuarios];
    arr.sort((a, b) => {
      const apA = !!a.aprobado;
      const apB = !!b.aprobado;
      if (apA !== apB) return apA ? 1 : -1; // pendientes primero
      const na = (a.nombre || '').toString();
      const nb = (b.nombre || '').toString();
      return na.localeCompare(nb);
    });
    return arr;
  }, [usuarios]);

  const pendientes = usuarios.filter((u) => !u.aprobado).length;

  if (!canManageUsers) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px', color: '#1B2A6B' }}>Acceso restringido</h2>
          <p style={{ margin: '0 0 18px', color: '#666', fontSize: '14px' }}>
            Solo el admin puede aprobar usuarios.
          </p>
          <button onClick={onFeed} style={{ padding: '12px 18px', background: '#1B2A6B', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'system-ui' }}>
      {notif && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: notif.tipo === 'exito' ? '#1B2A6B' : '#e53e3e', color: 'white', padding: '14px 22px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', fontSize: '14px', fontWeight: '600', zIndex: 1000, textAlign: 'center', minWidth: '320px' }}>
          {notif.tipo === 'exito' ? 'OK: ' : 'ERROR: '}{notif.msg}
        </div>
      )}

      <div style={{ background: '#1B2A6B', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/fondo1.jpg" alt="FJU" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white' }} />
          <div>
            <span style={{ color: 'white', fontWeight: '800', fontSize: '18px' }}>Panel Admin</span>
            <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: '12px' }}>Usuarios pendientes: {pendientes}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={cargarUsuarios} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>
            Actualizar
          </button>
          <button onClick={onFeed} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>
            Ver Feed
          </button>
          <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>
            Salir
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '24px auto', padding: '0 16px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: 0, color: '#1B2A6B' }}>Usuarios</h3>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: '13px' }}>
            Aprueba a los usuarios registrados. Pendientes aparecen primero.
          </p>
        </div>

        {loading && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: '12px', color: '#666' }}>
            Cargando usuarios...
          </div>
        )}

        {!loading && usuariosOrdenados.length === 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: '12px', color: '#666' }}>
            No hay usuarios.
          </div>
        )}

        {!loading && usuariosOrdenados.map((u) => (
          <div key={u.id} style={{ background: 'white', borderRadius: '16px', padding: '18px', marginTop: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#1B2A6B,#3d5a99)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800' }}>
                  {(u.nombre || u.email || '?').toString().charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: '800', color: '#1B2A6B' }}>{u.nombre || 'Sin nombre'}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{u.email || 'Sin email'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={u.rol || 'miembro'} onChange={(e) => cambiarRol(u.id, e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', border: '2px solid #eee', fontSize: '13px', cursor: 'pointer', fontWeight: '700' }}>
                  <option value="miembro">Miembro</option>
                  <option value="lider">Lider</option>
                  <option value="moderador">Moderador</option>
                  <option value="admin">Admin</option>
                </select>

                {!u.aprobado ? (
                  <button onClick={() => aprobarUsuario(u.id)} style={{ padding: '10px 14px', background: '#1B2A6B', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800' }}>
                    Aprobar
                  </button>
                ) : (
                  <span style={{ background: '#d4edda', color: '#155724', padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '800' }}>
                    Activo
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admin;
