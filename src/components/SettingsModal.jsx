import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotes } from '../context/NotesContext';
import { useP2P } from '../context/P2PContext';
import {
  X,
  Palette,
  Shield,
  Download,
  Upload,
  Check,
  Radio,
  Copy,
  Link2,
  RefreshCw,
  Smartphone
} from 'lucide-react';

export function SettingsModal({ isOpen, onClose }) {
  const { theme, setTheme, font, setFont } = useTheme();
  const { passwordHint, changePassword, autoLockMins, updateAutoLock } = useAuth();
  const { exportAllNotesJSON, importNotesJSON } = useNotes();
  const {
    syncCode,
    updateSyncCode,
    generateRandomSyncCode,
    myPeerId,
    statusMessage,
    activeConnections,
    connectToPeer
  } = useP2P();

  const [activeTab, setActiveTab] = useState('appearance'); // 'appearance', 'security', 'p2p', 'data'
  const [targetPeerInput, setTargetPeerInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newHint, setNewHint] = useState(passwordHint || '');
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  if (!isOpen) return null;

  const handleCopyPeerId = () => {
    if (myPeerId) {
      navigator.clipboard.writeText(myPeerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePairPeer = (e) => {
    e.preventDefault();
    if (targetPeerInput.trim()) {
      connectToPeer(targetPeerInput.trim());
      setTargetPeerInput('');
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassMsg({ type: '', text: '' });

    if (!newPassword || newPassword.length < 3) {
      setPassMsg({ type: 'error', text: 'New password must be at least 3 chars' });
      return;
    }

    const res = await changePassword(oldPassword, newPassword, newHint);
    if (res.success) {
      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
      setOldPassword('');
      setNewPassword('');
    } else {
      setPassMsg({ type: 'error', text: res.message || 'Failed to change password' });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const ok = importNotesJSON(event.target.result);
        if (ok) {
          alert('Notes backup imported successfully!');
          onClose();
        } else {
          alert('Invalid backup JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const themes = [
    { id: 'parchment', name: 'Warm Parchment', color: '#f7f4ee', accent: '#8c6d53' },
    { id: 'obsidian', name: 'Midnight Obsidian', color: '#121417', accent: '#88c0d0' },
    { id: 'slate', name: 'Nordic Slate', color: '#eef2f5', accent: '#3b82f6' },
    { id: 'sakura', name: 'Sakura Dusk', color: '#fcf7f8', accent: '#c25975' }
  ];

  const fonts = [
    { id: 'sans', name: 'Inter Sans' },
    { id: 'serif', name: 'Merriweather Serif' },
    { id: 'mono', name: 'JetBrains Mono' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Settings & Preferences</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', overflowX: 'auto' }}>
          <button
            className={`filter-chip ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={14} style={{ display: 'inline', marginRight: '4px' }} /> Appearance
          </button>
          <button
            className={`filter-chip ${activeTab === 'p2p' ? 'active' : ''}`}
            onClick={() => setActiveTab('p2p')}
          >
            <Radio size={14} style={{ display: 'inline', marginRight: '4px' }} /> P2P Sync
          </button>
          <button
            className={`filter-chip ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={14} style={{ display: 'inline', marginRight: '4px' }} /> Security
          </button>
          <button
            className={`filter-chip ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <Download size={14} style={{ display: 'inline', marginRight: '4px' }} /> Data Backup
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'appearance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="setting-option-group">
              <span className="setting-label">Visual Theme</span>
              <div className="theme-grid">
                {themes.map(t => (
                  <div
                    key={t.id}
                    className={`theme-card ${theme === t.id ? 'active' : ''}`}
                    onClick={() => setTheme(t.id)}
                  >
                    <div
                      className="theme-preview-dot"
                      style={{ backgroundColor: t.color, borderColor: t.accent }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="setting-option-group">
              <span className="setting-label">Typography Font</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fonts.map(f => (
                  <div
                    key={f.id}
                    className={`theme-card ${font === f.id ? 'active' : ''}`}
                    onClick={() => setFont(f.id)}
                    style={{ justifyContent: 'space-between' }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{f.name}</span>
                    {font === f.id && <Check size={16} color="var(--accent-primary)" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'p2p' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="setting-option-group">
              <span className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={16} /> Device Peer ID (This Device)
              </span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Share this Peer ID with your other device to connect directly over WebRTC without a server.
              </p>
              <div className="search-input-wrapper" style={{ justifyContent: 'space-between' }}>
                <code style={{ fontSize: '0.85rem', userSelect: 'all', wordBreak: 'break-all' }}>{myPeerId || 'Initializing...'}</code>
                <button
                  type="button"
                  onClick={handleCopyPeerId}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span style={{ fontSize: '0.75rem' }}>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="setting-option-group">
              <span className="setting-label">Pair with Remote Device</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Enter the Peer ID displayed on your phone or second laptop to initiate instant P2P note sync.
              </p>
              <form onSubmit={handlePairPeer} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Paste Remote Peer ID here..."
                  className="search-input-wrapper"
                  style={{ flex: 1, padding: '10px' }}
                  value={targetPeerInput}
                  onChange={(e) => setTargetPeerInput(e.target.value)}
                />
                <button type="submit" className="new-note-btn" style={{ width: 'auto', padding: '0 16px' }}>
                  <Link2 size={16} /> Pair
                </button>
              </form>
            </div>

            <div className="setting-option-group" style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Status: {statusMessage}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.__zenSyncAll) window.__zenSyncAll();
                  }}
                  className="icon-btn"
                  title="Sync All Notes Now"
                  style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem', gap: '4px', border: '1px solid var(--border-color)' }}
                >
                  <RefreshCw size={12} /> Force Sync
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Active Connected Peers: {activeConnections.length}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="setting-option-group">
              <span className="setting-label">Inactivity Auto-Lock</span>
              <select
                value={autoLockMins}
                onChange={(e) => updateAutoLock(parseInt(e.target.value, 10))}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value={0}>Disabled</option>
                <option value={2}>After 2 minutes idle</option>
                <option value={5}>After 5 minutes idle</option>
                <option value={15}>After 15 minutes idle</option>
              </select>
            </div>

            <div className="setting-option-group">
              <span className="setting-label">Change Master Password</span>
              <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="password"
                  placeholder="Current Password"
                  className="search-input-wrapper"
                  style={{ width: '100%', padding: '10px' }}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="New Password"
                  className="search-input-wrapper"
                  style={{ width: '100%', padding: '10px' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="New Password Hint (Optional)"
                  className="search-input-wrapper"
                  style={{ width: '100%', padding: '10px' }}
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                />

                {passMsg.text && (
                  <div style={{ fontSize: '0.8rem', color: passMsg.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
                    {passMsg.text}
                  </div>
                )}

                <button type="submit" className="new-note-btn" style={{ marginTop: '4px' }}>
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="setting-option-group">
              <span className="setting-label">Export Notes Workspace</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Save a full backup of all your notes, tags, and settings as a JSON file.
              </p>
              <button className="new-note-btn" onClick={exportAllNotesJSON}>
                <Download size={16} /> Export JSON Backup
              </button>
            </div>

            <div className="setting-option-group">
              <span className="setting-label">Restore Workspace Backup</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Import notes from a previously exported JSON backup file.
              </p>
              <label className="new-note-btn" style={{ cursor: 'pointer', textAlign: 'center' }}>
                <Upload size={16} /> Import JSON File
                <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
