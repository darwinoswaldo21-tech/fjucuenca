import React, { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../firebase';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import './Groups.css';

export default function GroupListScreen({ usuario, onBack, onOpenGroup }) {
  const [groups, setGroups] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('SERIE DE DIOS');
  const [description, setDescription] = useState('Capitulos y recursos para la comunidad FJU.');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'groups'), (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return groups;
    return groups.filter((g) => (g.name || '').toLowerCase().includes(s));
  }, [groups, search]);

  const canCreate = usuario?.rol === 'admin';

  const createGroup = async () => {
    const currentUid = auth.currentUser?.uid || usuario?.uid;
    if (!currentUid) return;
    if (!name.trim()) return;

    setLoading(true);
    try {
      const groupDoc = await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        description: description.trim(),
        visibility: 'private',
        joinPolicy: 'request',
        createdBy: currentUid,
        createdAt: serverTimestamp(),
      });

      // Creator becomes group admin + approved.
      await setDoc(doc(db, 'groups', groupDoc.id, 'members', currentUid), {
        status: 'approved',
        role: 'admin',
        requestedAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
      }, { merge: true });

      setCreating(false);
      onOpenGroup(groupDoc.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fju-groups">
      <div className="fju-gTop">
        <div className="fju-gTopInner">
          <div className="fju-gTitle">Grupos</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {canCreate && (
              <button className="fju-gBtn" onClick={() => setCreating(!creating)} type="button">
                {creating ? 'Cancelar' : 'Crear grupo'}
              </button>
            )}
            <button className="fju-gBtn" onClick={onBack} type="button">Volver</button>
          </div>
        </div>
      </div>

      <div className="fju-gShell">
        <div className="fju-gCard">
          <div className="fju-gCardHead">
            <div style={{ fontWeight: 800, color: '#9d174d' }}>Explorar</div>
            <input
              className="fju-gInput"
              style={{ maxWidth: 260 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo..."
            />
          </div>
          <div className="fju-gCardBody">
            {filtered.length === 0 && (
              <div className="fju-gNote">No hay grupos todavía.</div>
            )}
            <div className="fju-gGrid">
              {filtered.map((g) => (
                <div key={g.id} className="fju-gItem" onClick={() => onOpenGroup(g.id)}>
                  <p className="fju-gItemTitle">{g.name || 'Grupo'}</p>
                  <p className="fju-gItemDesc">{g.description || 'Sin descripcion'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {creating && canCreate && (
          <div className="fju-gCard">
            <div className="fju-gCardHead">
              <div style={{ fontWeight: 800, color: '#9d174d' }}>Nuevo grupo</div>
              <div className="fju-gNote">Privado con solicitud</div>
            </div>
            <div className="fju-gCardBody" style={{ display: 'grid', gap: 10 }}>
              <input className="fju-gInput" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del grupo" />
              <textarea className="fju-gTextarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion" />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="fju-gPrimary" onClick={createGroup} disabled={loading} type="button">
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
              <div className="fju-gNote">Tip: crea “SERIE DE DIOS” y sube capitulos como YouTube “No listado”.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


