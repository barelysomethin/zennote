import React from 'react';
import { useNotes } from '../context/NotesContext';
import {
  Feather,
  Plus,
  Search,
  Pin,
  Trash2,
  Tag,
  FileText,
  RotateCcw,
  Sparkles,
  X
} from 'lucide-react';

export function Sidebar() {
  const {
    notes,
    activeNoteId,
    setActiveNoteId,
    createNote,
    deleteNote,
    restoreNote,
    togglePinNote,
    searchTerm,
    setSearchTerm,
    allTags,
    selectedTag,
    setSelectedTag,
    filterView,
    setFilterView
  } = useNotes();

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            <Feather size={18} />
          </div>
          <span>ZenNote</span>
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search notes or #tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* View Filters */}
      <div className="nav-filters">
        <button
          className={`filter-chip ${filterView === 'all' && !selectedTag ? 'active' : ''}`}
          onClick={() => {
            setFilterView('all');
            setSelectedTag(null);
          }}
        >
          All Notes
        </button>
        <button
          className={`filter-chip ${filterView === 'pinned' ? 'active' : ''}`}
          onClick={() => {
            setFilterView('pinned');
            setSelectedTag(null);
          }}
        >
          Pinned
        </button>
        <button
          className={`filter-chip ${filterView === 'trash' ? 'active' : ''}`}
          onClick={() => {
            setFilterView('trash');
            setSelectedTag(null);
          }}
        >
          Trash
        </button>
      </div>

      {/* Tag Chips */}
      {allTags.length > 0 && filterView !== 'trash' && (
        <div className="nav-filters" style={{ paddingTop: 0, paddingBottom: '8px' }}>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`filter-chip ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              style={{ fontSize: '0.7rem' }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Notes List */}
      <div className="note-list-section">
        {notes.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 10px' }}>
            <FileText size={32} opacity={0.4} />
            <span style={{ fontSize: '0.85rem' }}>No notes found</span>
          </div>
        ) : (
          notes.map(note => {
            const isActive = note.id === activeNoteId;
            return (
              <div
                key={note.id}
                className={`note-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveNoteId(note.id)}
              >
                <div className="note-item-header">
                  <span className="note-title">{note.title || 'Untitled Note'}</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {!note.isTrash && (
                      <button
                        className="icon-btn"
                        style={{ width: '24px', height: '24px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinNote(note.id);
                        }}
                        title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
                      >
                        <Pin
                          size={13}
                          color={note.isPinned ? 'var(--accent-primary)' : 'var(--text-muted)'}
                          fill={note.isPinned ? 'var(--accent-primary)' : 'none'}
                        />
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      style={{ width: '24px', height: '24px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (note.isTrash) {
                          restoreNote(note.id);
                        } else {
                          deleteNote(note.id);
                        }
                      }}
                      title={note.isTrash ? 'Restore Note' : 'Move to Trash'}
                    >
                      {note.isTrash ? <RotateCcw size={13} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                <div className="note-snippet">
                  {note.content ? note.content.replace(/[#*`_>]/g, '') : 'Empty note...'}
                </div>

                <div className="note-meta">
                  <span>{formatDate(note.updatedAt)}</span>
                  {note.tags && note.tags.length > 0 && (
                    <div className="tag-list">
                      {note.tags.slice(0, 2).map(t => (
                        <span key={t} className="mini-tag">#{t}</span>
                      ))}
                      {note.tags.length > 2 && (
                        <span className="mini-tag">+{note.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Create Note */}
      <div className="sidebar-footer">
        <button className="new-note-btn" onClick={createNote}>
          <Plus size={18} /> New Note
        </button>
      </div>
    </aside>
  );
}
