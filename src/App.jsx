import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotesProvider } from './context/NotesContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { P2PProvider } from './context/P2PContext';

import { LockScreen } from './components/LockScreen';
import { ZenHeader } from './components/ZenHeader';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { SettingsModal } from './components/SettingsModal';

function AppContent() {
  const { isLocked, hasPasswordSet, lockApp } = useAuth();
  const { zenFocusMode, toggleZenFocusMode } = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return window.innerWidth > 768;
  });

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
    <div className={`app-container ${zenFocusMode ? 'zen-active' : ''} ${!isSidebarOpen ? 'sidebar-closed' : 'sidebar-open'}`}>
      {/* Password Lock Screen Overlay */}
      <LockScreen />

      {/* Main Workspace (Visible when unlocked or set up) */}
      {(!isLocked || !hasPasswordSet) && (
        <>
          {/* Backdrop for mobile overlay when sidebar is open */}
          {isSidebarOpen && (
            <div
              className="mobile-overlay"
              onClick={() => setIsSidebarOpen(false)}
              style={{ display: window.innerWidth <= 768 ? 'block' : 'none' }}
            />
          )}

          <Sidebar onCloseMobile={() => setIsSidebarOpen(false)} />

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
        <P2PProvider>
          <NotesProvider>
            <AppContent />
          </NotesProvider>
        </P2PProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
