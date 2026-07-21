import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotesProvider, useNotes } from './context/NotesContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { P2PProvider, useP2P } from './context/P2PContext';

import { LockScreen } from './components/LockScreen';
import { ZenHeader } from './components/ZenHeader';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { SettingsModal } from './components/SettingsModal';

function P2PNotesBridge({ children }) {
  const [broadcastUpdateFn, setBroadcastUpdateFn] = useState(() => () => {});
  const [broadcastDeleteFn, setBroadcastDeleteFn] = useState(() => () => {});

  return (
    <P2PProviderBridge
      setBroadcastUpdateFn={setBroadcastUpdateFn}
      setBroadcastDeleteFn={setBroadcastDeleteFn}
    >
      <NotesProvider
        broadcastUpdate={(note) => broadcastUpdateFn(note)}
        broadcastDelete={(id) => broadcastDeleteFn(id)}
      >
        <NotesP2PSyncConsumer>{children}</NotesP2PSyncConsumer>
      </NotesProvider>
    </P2PProviderBridge>
  );
}

function P2PProviderBridge({ children, setBroadcastUpdateFn, setBroadcastDeleteFn }) {
  const dummyNotes = [];

  const handleRemoteUpdate = (note) => {
    if (window.__zenApplyRemoteUpsert) window.__zenApplyRemoteUpsert(note);
  };
  const handleRemoteDelete = (id) => {
    if (window.__zenApplyRemoteDelete) window.__zenApplyRemoteDelete(id);
  };
  const handleBulkSync = (notes) => {
    if (window.__zenApplyBulkSync) window.__zenApplyBulkSync(notes);
  };

  return (
    <P2PProvider
      notes={dummyNotes}
      onRemoteUpdateNote={handleRemoteUpdate}
      onRemoteDeleteNote={handleRemoteDelete}
      onBulkSyncNotes={handleBulkSync}
    >
      <P2PContextRegistrar
        setBroadcastUpdateFn={setBroadcastUpdateFn}
        setBroadcastDeleteFn={setBroadcastDeleteFn}
      >
        {children}
      </P2PContextRegistrar>
    </P2PProvider>
  );
}

function P2PContextRegistrar({ children, setBroadcastUpdateFn, setBroadcastDeleteFn }) {
  const { broadcastNoteUpdate, broadcastNoteDelete } = useP2P();

  useEffect(() => {
    setBroadcastUpdateFn(() => (note) => broadcastNoteUpdate(note));
    setBroadcastDeleteFn(() => (id) => broadcastNoteDelete(id));
  }, [broadcastNoteUpdate, broadcastNoteDelete, setBroadcastUpdateFn, setBroadcastDeleteFn]);

  return children;
}

function NotesP2PSyncConsumer({ children }) {
  const { applyRemoteNoteUpsert, applyRemoteNoteDelete, applyBulkSyncNotes } = useNotes();

  useEffect(() => {
    window.__zenApplyRemoteUpsert = applyRemoteNoteUpsert;
    window.__zenApplyRemoteDelete = applyRemoteNoteDelete;
    window.__zenApplyBulkSync = applyBulkSyncNotes;
  }, [applyRemoteNoteUpsert, applyRemoteNoteDelete, applyBulkSyncNotes]);

  return children;
}

function AppContent() {
  const { isLocked, hasPasswordSet, lockApp } = useAuth();
  const { zenFocusMode, toggleZenFocusMode } = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Esc to toggle Zen mode
      if (e.key === 'Escape') {
        toggleZenFocusMode();
      }
      // Ctrl + L or Cmd + L to lock app
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        lockApp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleZenFocusMode, lockApp]);

  return (
    <div className={`app-container ${zenFocusMode ? 'zen-active' : ''}`}>
      {/* Password Lock Screen Overlay */}
      <LockScreen />

      {/* Main Workspace (Visible when unlocked or set up) */}
      {(!isLocked || !hasPasswordSet) && (
        <>
          {isSidebarOpen && <Sidebar />}

          <main className="main-content">
            <ZenHeader
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            <NoteEditor />

            {/* Settings & Preferences Modal */}
            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
            />
          </main>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <P2PNotesBridge>
          <AppContent />
        </P2PNotesBridge>
      </ThemeProvider>
    </AuthProvider>
  );
}
