import React, { useEffect, useRef, useState } from 'react';
import { auth, db } from '../firebase';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import './Groups.css';

function ytIdFromUrl(url) {
  const regExp = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = (url || '').match(regExp);
  return match ? match[1] : null;
}

export default function GroupScreen({ usuario, groupId, onBack }) {
  const currentUid = auth.currentUser?.uid || usuario?.uid;

  const [group, setGroup] = useState(null);
  const [member, setMember] = useState(null);
  const [tab, setTab] = useState('episodes');
  const [editingGroup, setEditingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  const [episodes, setEpisodes] = useState([]);
  const [pending, setPending] = useState([]);

  const [adding, setAdding] = useState(false);
  const [season, setSeason] = useState('1');
  const [episodeNumber, setEpisodeNumber] = useState('1');
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(null);

  const listBottomRef = useRef(null);

  useEffect(() => {
    if (!groupId) return undefined;
    const unsub = onSnapshot(doc(db, 'groups', groupId), (snap) => {
      setGroup(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return () => unsub();
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !currentUid) return undefined;
    const unsub = onSnapshot(doc(db, 'groups', groupId, 'members', currentUid), (snap) => {
      setMember(snap.exists() ? snap.data() : null);
    });
    return () => unsub();
  }, [groupId, currentUid]);

  const isApproved = member?.status === 'approved';
  const canModerate = isApproved && (member?.role === 'admin' || member?.role === 'mod');

  useEffect(() => {
    if (!group) return;
    if (editingGroup) return;
    setEditName(group.name || '');
    setEditDesc(group.description || '');
  }, [group, editingGroup]);

  useEffect(() => {
    if (!groupId || !isApproved) {
      setEpisodes([]);
      return undefined;
    }
    const q = query(collection(db, 'groups', groupId, 'episodes'), orderBy('season', 'asc'), orderBy('episodeNumber', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setEpisodes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [groupId, isApproved]);

  useEffect(() => {
    if (!groupId || !canModerate) {
      setPending([]);
      return undefined;
    }
    const q = query(collection(db, 'groups', groupId, 'members'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => {
      setPending(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [groupId, canModerate]);

  useEffect(() => {
    listBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [episodes.length]);

  const requestJoin = async () => {
    if (!groupId || !currentUid) return;
    setNote(null);
    try {
      await setDoc(doc(db, 'groups', groupId, 'members', currentUid), {
        status: 'pending',
        role: 'member',
        requestedAt: serverTimestamp(),
        nombre: usuario?.nombre || auth.currentUser?.displayName || auth.currentUser?.email || '',
      }, { merge: true });
      setNote('Solicitud enviada. Un administrador la revisara.');
    } catch (e) {
      setNote('No se pudo enviar la solicitud.');
    }
  };

  const approveUser = async (uid) => {
    if (!groupId || !uid) return;
    await updateDoc(doc(db, 'groups', groupId, 'members', uid), {
      status: 'approved',
      role: 'member',
      approvedAt: serverTimestamp(),
    });
  };

  const saveGroup = async () => {
    if (!groupId) return;
    if (!editName.trim()) {
      setNote('El nombre del grupo no puede estar vacio.');
      return;
    }

    setSavingGroup(true);
    setNote(null);
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        name: editName.trim(),
        description: editDesc.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditingGroup(false);
      setNote('Grupo actualizado.');
    } catch (e) {
      setNote('No se pudo actualizar el grupo.');
    } finally {
      setSavingGroup(false);
    }
  };

  const addEpisode = async () => {
    if (!groupId || !currentUid) return;
    const yt = ytIdFromUrl(youtubeUrl);
    if (!yt) {
      setNote('Link de YouTube invalido. Usa un link tipo youtu.be/xxxx o watch?v=xxxx');
      return;
    }
    if (!title.trim()) {
      setNote('Escribe el titulo del capitulo.');
      return;
    }

    setSaving(true);
    setNote(null);
    try {
      await addDoc(collection(db, 'groups', groupId, 'episodes'), {
        season: Number(season) || 1,
        episodeNumber: Number(episodeNumber) || 1,
        title: title.trim(),
        youtubeId: yt,
        youtubeUrl: youtubeUrl.trim(),
        thumbnail: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
        createdBy: currentUid,
        createdAt: serverTimestamp(),
      });
      setAdding(false);
      setTitle('');
      setYoutubeUrl('');
      setEpisodeNumber(String((Number(episodeNumber) || 1) + 1));
    } catch (e) {
      setNote('No se pudo guardar el capitulo.');
    } finally {
      setSaving(false);
    }
  };

  const tabBtn = (id, label) => (
    <button
      className="fju-gBtn"
      style={{
        borderColor: tab === id ? 'rgba(245,166,35,0.45)' : 'rgba(255,255,255,0.14)',
        background: tab === id ? 'rgba(245,166,35,0.14)' : 'rgba(255,255,255,0.06)',
      }}
      onClick={() => setTab(id)}
      type="button"
    >
      {label}
    </button>
  );

  const groupTitle = group?.name || 'Grupo';
  const groupDesc = group?.description || '';
  const canOpenExternal = !!group && (canModerate || group.createdBy === currentUid);

  return (
    <div className="fju-groups">
      <div className="fju-gTop">
        <div className="fju-gTopInner">
          <div>
            <div className="fju-gTitle">{groupTitle}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'Inter, system-ui' }}>
              {groupDesc}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isApproved && tabBtn('episodes', 'Capitulos')}
            {canModerate && tabBtn('requests', `Solicitudes (${pending.length})`)}
            {canModerate && (
              <button className="fju-gBtn" onClick={() => setEditingGroup(!editingGroup)} type="button">
                {editingGroup ? 'Cancelar' : 'Editar'}
              </button>
            )}
            <button className="fju-gBtn" onClick={onBack} type="button">Volver</button>
          </div>
        </div>
      </div>

      <div className="fju-gShell">
        {isApproved && canModerate && editingGroup && (
          <div className="fju-gCard">
            <div className="fju-gCardHead">
              <div style={{ fontWeight: 900, color: '#1b2a6b' }}>Editar grupo</div>
              <div className="fju-gNote">Solo admins/mods</div>
            </div>
            <div className="fju-gCardBody" style={{ display: 'grid', gap: 10 }}>
              <input className="fju-gInput" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre del grupo" />
              <textarea className="fju-gTextarea" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descripcion" />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="fju-gPrimary" onClick={saveGroup} disabled={savingGroup} type="button">
                  {savingGroup ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}
        {note && (
          <div className="fju-gCard">
            <div className="fju-gCardBody">
              <div className="fju-gNote">{note}</div>
            </div>
          </div>
        )}

        {!isApproved && (
          <div className="fju-gCard">
            <div className="fju-gCardHead">
              <div style={{ fontWeight: 900, color: '#1b2a6b' }}>Acceso</div>
              <div className="fju-gNote">{member?.status === 'pending' ? 'Pendiente' : 'No eres miembro'}</div>
            </div>
            <div className="fju-gCardBody" style={{ display: 'grid', gap: 10 }}>
              {member?.status === 'pending' ? (
                <div className="fju-gNote">Tu solicitud esta en revision por el admin del grupo.</div>
              ) : (
                <>
                  <div className="fju-gNote">Este grupo es privado. Solicita ingreso para ver los capitulos.</div>
                  <div>
                    <button className="fju-gPrimary" onClick={requestJoin} type="button">Solicitar ingreso</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {isApproved && tab === 'episodes' && (
          <>
            {canModerate && (
              <div className="fju-gCard">
                <div className="fju-gCardHead">
                  <div style={{ fontWeight: 900, color: '#1b2a6b' }}>Capitulos</div>
                  <button className="fju-gBtn" onClick={() => setAdding(!adding)} type="button">
                    {adding ? 'Cancelar' : 'Subir capitulo'}
                  </button>
                </div>
                {adding && (
                  <div className="fju-gCardBody" style={{ display: 'grid', gap: 10 }}>
                    <div className="fju-gFormRow">
                      <input className="fju-gInput" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="Temporada" />
                      <input className="fju-gInput" value={episodeNumber} onChange={(e) => setEpisodeNumber(e.target.value)} placeholder="Capitulo #" />
                    </div>
                    <input className="fju-gInput" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titulo del capitulo" />
                    <input className="fju-gInput" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="Link de YouTube (No listado)" />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="fju-gPrimary" onClick={addEpisode} disabled={saving} type="button">
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                    <div className="fju-gNote">Sugerencia: en YouTube pon el video como “No listado”.</div>
                  </div>
                )}
              </div>
            )}

            <div className="fju-gCard">
              <div className="fju-gCardHead">
                <div style={{ fontWeight: 900, color: '#1b2a6b' }}>Lista</div>
                <div className="fju-gNote">{episodes.length} capitulos</div>
              </div>
              <div className="fju-gCardBody" style={{ display: 'grid', gap: 12 }}>
                {episodes.length === 0 && (
                  <div className="fju-gNote">Aun no hay capitulos. El admin puede subir el primero.</div>
                )}
                {episodes.map((ep) => (
                  <div key={ep.id} className="fju-epItem">
                    <div className="fju-epHead">
                      <div>
                        <p className="fju-epTitle">
                          T{ep.season || 1} · E{ep.episodeNumber || 1} — {ep.title}
                        </p>
                        <p className="fju-epMeta">SERIE DE DIOS</p>
                      </div>
                      {canOpenExternal && (
                        <a
                          className="fju-gBtn"
                          href={ep.youtubeUrl || `https://youtu.be/${ep.youtubeId}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ textDecoration: 'none' }}
                        >
                          Abrir
                        </a>
                      )}
                    </div>
                    <iframe
                      className="fju-epFrame"
                      src={`https://www.youtube.com/embed/${ep.youtubeId}`}
                      title={ep.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ))}
                <div ref={listBottomRef} />
              </div>
            </div>
          </>
        )}

        {isApproved && canModerate && tab === 'requests' && (
          <div className="fju-gCard">
            <div className="fju-gCardHead">
              <div style={{ fontWeight: 900, color: '#1b2a6b' }}>Solicitudes</div>
              <div className="fju-gNote">Aprueba quien puede ver la serie</div>
            </div>
            <div className="fju-gCardBody" style={{ display: 'grid', gap: 10 }}>
              {pending.length === 0 && (
                <div className="fju-gNote">No hay solicitudes pendientes.</div>
              )}
              {pending.map((p) => (
                <div
                  key={p.uid}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 12,
                    border: '1px solid rgba(12,18,34,0.10)',
                    background: 'rgba(255,255,255,0.75)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#1b2a6b', fontSize: 13.5 }}>
                      {p.nombre || 'Usuario'} <span style={{ color: 'rgba(12,18,34,0.45)', fontWeight: 600 }}>({p.uid})</span>
                    </div>
                    <div className="fju-gNote">Estado: pendiente</div>
                  </div>
                  <button className="fju-gPrimary" onClick={() => approveUser(p.uid)} type="button">Aprobar</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
