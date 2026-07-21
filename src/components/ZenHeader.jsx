import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotes } from '../context/NotesContext';
import { useP2P } from '../context/P2PContext';
import {
  Maximize2,
  Minimize2,
  Lock,
  Settings,
  Download,
  Sidebar as SidebarIcon,
  Wifi,
  Radio
} from 'lucide-react';

export function ZenHeader({
  onToggleSidebar,
  isSidebarOpen,
  onOpenSettings
}) {
  const { zenFocusMode, toggleZenFocusMode } = useTheme();
  const { lockApp } = useAuth();
  const { activeNote, isSaved } = useNotes();
  const { statusMessage, activeConnections } = useP2P();

  const handleExportNote = () => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeNote.title || 'Untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isP2PActive = activeConnections && activeConnections.length > 0;

  return (
    <header className="zen-header">
      <div className="header-left">
        <button
          className="icon-btn"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          <SidebarIcon size={19} />
        </button>

        {activeNote && (
          <div className="header-title-info">
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
              {activeNote.title || 'Untitled'}
            </span>
            <div className="saved-indicator">
              <span className="saved-dot"></span>
              <span>{isSaved ? 'Saved' : 'Saving...'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="header-right">
        {/* P2P Device Sync Indicator */}
        <button
          className={`icon-btn ${isP2PActive ? 'active' : ''}`}
          onClick={onOpenSettings}
          title={`P2P Status: ${statusMessage}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'auto', padding: '0 8px' }}
        >
          <Radio size={16} color={isP2PActive ? 'var(--success)' : 'var(--text-muted)'} />
          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
            {isP2PActive ? `${activeConnections.length} Peer Sync` : 'P2P Sync'}
          </span>
        </button>

        {activeNote && (
          <button className="icon-btn" onClick={handleExportNote} title="Export Note (.md)">
            <Download size={18} />
          </button>
        )}

        <button
          className={`icon-btn ${zenFocusMode ? 'active' : ''}`}
          onClick={toggleZenFocusMode}
          title={zenFocusMode ? 'Exit Zen Mode (Esc)' : 'Enter Zen Focus Mode'}
        >
          {zenFocusMode ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
        </button>

        <button className="icon-btn" onClick={onOpenSettings} title="Settings & Themes">
          <Settings size={19} />
        </button>

        <button className="icon-btn" onClick={lockApp} title="Lock App Now">
          <Lock size={18} />
        </button>
      </div>
    </header>
  );
}
