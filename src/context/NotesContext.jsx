import React, { createContext, useContext, useState, useEffect } from 'react';
import { useP2P } from './P2PContext';

const NotesContext = createContext();

const STORAGE_KEY_NOTES = 'zen_notes_data';

const DEFAULT_WELCOME_NOTE = {
  id: 'welcome-zen-note',
  title: 'Welcome to ZenNote',
  content: `# Welcome to ZenNote 🍃

A clutter-free, private, and minimal environment designed for your best thoughts and ideas.

---

### Key Features

- 🔒 **Password Protected**: Stored safely in your browser local storage.
- 🧘 **Zen Focus Mode**: Click the expansion icon or press \`Esc\` to hide all UI elements.
- 🔄 **P2P Device Sync**: Connect phone & laptop directly over WebRTC (No Central Database!).
- 🏷️ **Tags & Search**: Organize your notes with custom tags like \`#ideas\` or \`#journal\`.
- ✍️ **Markdown Support**: Supports **bold**, *italics*, \`code blocks\`, blockquotes, and tasks:
  - [x] Create your master password
  - [ ] Pair your phone & laptop via P2P
  - [ ] Try Zen focus mode

> *"Simplicity is about subtracting the obvious and adding the meaningful."* — John Maeda
`,
  tags: ['welcome', 'guide'],
  isPinned: true,
  isTrash: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export function NotesProvider({ children }) {
  const p2p = useP2P();

  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load notes', e);
    }
    return [DEFAULT_WELCOME_NOTE];
  });

  const [activeNoteId, setActiveNoteId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_NOTES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].id;
      } catch (e) {}
    }
    return 'welcome-zen-note';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [filterView, setFilterView] = useState('all'); // 'all', 'pinned', 'trash'
  const [isSaved, setIsSaved] = useState(true);

  // Sync with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
      setIsSaved(true);
    } catch (e) {
      console.error('Failed to persist notes to localStorage', e);
    }
  }, [notes]);

  // Register P2P handlers
  useEffect(() => {
    if (p2p && p2p.setRemoteHandlers) {
      p2p.setRemoteHandlers({
        onRemoteUpdateNote: (remoteNote) => {
          setNotes(prev => {
            const exists = prev.find(n => n.id === remoteNote.id);
            if (!exists) return [remoteNote, ...prev];
            if (new Date(remoteNote.updatedAt) > new Date(exists.updatedAt)) {
              return prev.map(n => (n.id === remoteNote.id ? remoteNote : n));
            }
            return prev;
          });
        },
        onRemoteDeleteNote: (remoteId) => {
          setNotes(prev => prev.filter(n => n.id !== remoteId));
        },
        onBulkSyncNotes: (remoteNotes) => {
          setNotes(prev => {
            const mergedMap = new Map(prev.map(n => [n.id, n]));
            remoteNotes.forEach(rn => {
              const local = mergedMap.get(rn.id);
              if (!local || new Date(rn.updatedAt) > new Date(local.updatedAt)) {
                mergedMap.set(rn.id, rn);
              }
            });
            return Array.from(mergedMap.values());
          });
        }
      });
    }
  }, [p2p]);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const createNote = () => {
    const newNote = {
      id: 'note_' + Date.now(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      isPinned: false,
      isTrash: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setIsSaved(false);

    if (p2p && p2p.broadcastNoteUpdate) {
      p2p.broadcastNoteUpdate(newNote);
    }
    return newNote.id;
  };

  const updateNote = (id, updates, skipBroadcast = false) => {
    setIsSaved(false);
    let updatedObj = null;

    setNotes(prev =>
      prev.map(note => {
        if (note.id === id) {
          updatedObj = { ...note, ...updates, updatedAt: new Date().toISOString() };
          return updatedObj;
        }
        return note;
      })
    );

    if (!skipBroadcast && p2p && p2p.broadcastNoteUpdate && updatedObj) {
      p2p.broadcastNoteUpdate(updatedObj);
    }
  };

  const deleteNote = (id) => {
    const target = notes.find(n => n.id === id);
    if (target?.isTrash) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNoteId === id) {
        const remaining = notes.filter(n => n.id !== id);
        setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
      }
      if (p2p && p2p.broadcastNoteDelete) {
        p2p.broadcastNoteDelete(id);
      }
    } else {
      updateNote(id, { isTrash: true, isPinned: false });
    }
  };

  const restoreNote = (id) => {
    updateNote(id, { isTrash: false });
  };

  const togglePinNote = (id) => {
    const target = notes.find(n => n.id === id);
    if (target) {
      updateNote(id, { isPinned: !target.isPinned });
    }
  };

  const addTagToNote = (id, tag) => {
    const cleanTag = tag.trim().replace(/^#/, '').toLowerCase();
    if (!cleanTag) return;
    const target = notes.find(n => n.id === id);
    if (target && !target.tags.includes(cleanTag)) {
      updateNote(id, { tags: [...target.tags, cleanTag] });
    }
  };

  const removeTagFromNote = (id, tagToRemove) => {
    const target = notes.find(n => n.id === id);
    if (target) {
      updateNote(id, { tags: target.tags.filter(t => t !== tagToRemove) });
    }
  };

  // Get list of all unique tags
  const allTags = Array.from(
    new Set(
      notes
        .filter(n => !n.isTrash)
        .flatMap(n => n.tags || [])
    )
  );

  // Filtered notes selector
  const filteredNotes = notes.filter(note => {
    if (filterView === 'trash') {
      if (!note.isTrash) return false;
    } else {
      if (note.isTrash) return false;
      if (filterView === 'pinned' && !note.isPinned) return false;
    }

    if (selectedTag && (!note.tags || !note.tags.includes(selectedTag))) {
      return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = note.title.toLowerCase().includes(term);
      const matchContent = note.content.toLowerCase().includes(term);
      const matchTag = note.tags?.some(t => t.toLowerCase().includes(term));
      return matchTitle || matchContent || matchTag;
    }

    return true;
  });

  const exportAllNotesJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `zen_notes_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importNotesJSON = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        setNotes(parsed);
        if (parsed.length > 0) setActiveNoteId(parsed[0].id);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return (
    <NotesContext.Provider
      value={{
        notes: filteredNotes,
        allNotes: notes,
        activeNote,
        activeNoteId,
        setActiveNoteId,
        createNote,
        updateNote,
        deleteNote,
        restoreNote,
        togglePinNote,
        addTagToNote,
        removeTagFromNote,
        allTags,
        searchTerm,
        setSearchTerm,
        selectedTag,
        setSelectedTag,
        filterView,
        setFilterView,
        isSaved,
        exportAllNotesJSON,
        importNotesJSON
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export const useNotes = () => useContext(NotesContext);
