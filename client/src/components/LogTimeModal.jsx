import { useState } from 'react';
import { Modal, FormField } from './ui';
import api from '../utils/api';
import { useApp } from '../context/AppContext';

export default function LogTimeModal({ taskId, taskTitle, currentLogged, onClose, onLogged }) {
  const { showToast } = useApp();
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const totalMinutes = (parseInt(hours || 0) * 60) + parseInt(minutes || 0);

  const save = async () => {
    if (totalMinutes < 1) { showToast('Enter at least 1 minute', 'error'); return; }
    setSaving(true);
    try {
      await api.post(`/tasks/${taskId}/time`, { minutes: totalMinutes, note: note || null });
      showToast(`${totalMinutes}m logged on "${taskTitle}"`);
      onLogged && onLogged(totalMinutes);
      onClose();
    } catch {
      showToast('Failed to log time', 'error');
    } finally { setSaving(false); }
  };

  const presets = [15, 30, 60, 90, 120];

  return (
    <Modal title="Log Time" onClose={onClose} width={400}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 12, color: '#6b6980' }}>
          Task: <span style={{ color: '#e8e6f0', fontWeight: 500 }}>{taskTitle}</span>
        </div>

        {/* Quick presets */}
        <div>
          <div style={{ fontSize: 11, color: '#6b6980', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Select</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {presets.map(m => (
              <button key={m} onClick={() => { setHours(String(Math.floor(m/60))); setMinutes(String(m%60)); }}
                style={{ padding: '5px 10px', borderRadius: 6, border: totalMinutes === m ? '1px solid #7c6ef7' : '1px solid rgba(255,255,255,0.1)', background: totalMinutes === m ? 'rgba(124,110,247,0.15)' : 'transparent', color: totalMinutes === m ? '#a394ff' : '#9b99b0', fontSize: 12, cursor: 'pointer' }}>
                {m >= 60 ? `${m/60}h` : `${m}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Manual entry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Hours">
            <input type="number" value={hours} onChange={e => setHours(e.target.value)} min="0" max="24" placeholder="0" style={{ width: '100%' }} />
          </FormField>
          <FormField label="Minutes">
            <input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} min="0" max="59" placeholder="0" style={{ width: '100%' }} />
          </FormField>
        </div>

        <FormField label="Note (optional)">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="What did you work on?" style={{ width: '100%' }} />
        </FormField>

        {totalMinutes > 0 && (
          <div style={{ fontSize: 12, color: '#14b8a6', background: 'rgba(20,184,166,0.08)', borderRadius: 8, padding: '8px 12px' }}>
            Logging <strong>{hours && parseInt(hours) > 0 ? `${hours}h ` : ''}{minutes && parseInt(minutes) > 0 ? `${minutes}m` : ''}</strong>
            {' '}· Total will be {Math.round((currentLogged + totalMinutes)/60 * 10)/10}h
          </div>
        )}
      </div>
      <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#9b99b0', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        <button onClick={save} disabled={saving || totalMinutes < 1}
          style={{ padding: '8px 20px', background: saving || totalMinutes < 1 ? '#252538' : '#7c6ef7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 500, fontSize: 13, cursor: saving || totalMinutes < 1 ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Logging...' : 'Log Time'}
        </button>
      </div>
    </Modal>
  );
}
