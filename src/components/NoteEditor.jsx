import React, { useState, useEffect } from 'react';
import { useNotes } from '../context/NotesContext';
import { useTheme } from '../context/ThemeContext';
import { parseMarkdown, calculateReadingStats } from '../utils/markdown';
import { Eye, Edit3, Columns, X, Sparkles } from 'lucide-react';

export function NoteEditor() {
  const { activeNote, updateNote, addTagToNote, removeTagFromNote, createNote } = useNotes();
  const { zenFocusMode, toggleZenFocusMode } = useTheme();

  const [viewMode, setViewMode] = useState('write'); // 'write', 'preview', 'split'
  const [newTagInput, setNewTagInput] = useState('');

  if (!activeNote) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Edit3 size={28} />
        </div>
        <h3>No Note Selected</h3>
        <p style={{ fontSize: '0.85rem' }}>Select a note from the sidebar or start fresh.</p>
        <button className="new-note-btn" style={{ width: 'auto', marginTop: '12px' }} onClick={createNote}>
          Create New Note
        </button>
      </div>
    );
  }

  const stats = calculateReadingStats(activeNote.content);

  const handleTitleChange = (e) => {
    updateNote(activeNote.id, { title: e.target.value });
  };

  const handleContentChange = (e) => {
    updateNote(activeNote.id, { content: e.target.value });
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      addTagToNote(activeNote.id, newTagInput);
      setNewTagInput('');
    }
  };

  return (
    <div className="editor-wrapper">
      {/* Title */}
      <input
        type="text"
        className="editor-title-input"
        placeholder="Untitled Note..."
        value={activeNote.title || ''}
        onChange={handleTitleChange}
        disabled={activeNote.isTrash}
      />

      {/* Tags Bar */}
      <div className="editor-tags-bar">
        {activeNote.tags && activeNote.tags.map(t => (
          <span key={t} className="tag-badge">
            #{t}
            {!activeNote.isTrash && (
              <button onClick={() => removeTagFromNote(activeNote.id, t)}>
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {!activeNote.isTrash && (
          <input
            type="text"
            className="add-tag-input"
            placeholder="+ Add #tag..."
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={handleAddTag}
          />
        )}

        {/* View Mode Toggle Controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button
            className={`icon-btn ${viewMode === 'write' ? 'active' : ''}`}
            onClick={() => setViewMode('write')}
            title="Editor Only"
          >
            <Edit3 size={15} />
          </button>
          <button
            className={`icon-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
            title="Split Mode"
          >
            <Columns size={15} />
          </button>
          <button
            className={`icon-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
            title="Preview Mode"
          >
            <Eye size={15} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="editor-canvas-container">
        {(viewMode === 'write' || viewMode === 'split') && (
          <textarea
            className="editor-textarea"
            placeholder="Begin typing your thoughts in markdown..."
            value={activeNote.content || ''}
            onChange={handleContentChange}
            disabled={activeNote.isTrash}
            autoFocus
          />
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className="markdown-preview"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(activeNote.content) || '<em>Empty markdown preview...</em>' }}
          />
        )}
      </div>

      {/* Footer Word Counter Stats Bar */}
      <div className="editor-stats-bar">
        <span>{stats.words} words</span>
        <span>•</span>
        <span>{stats.characters} chars</span>
        <span>•</span>
        <span>{stats.readingTime}</span>
        {zenFocusMode && (
          <>
            <span>•</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Zen Focus Mode (Esc to exit)</span>
          </>
        )}
      </div>
    </div>
  );
}
