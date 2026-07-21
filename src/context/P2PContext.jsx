import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';

const P2PContext = createContext();

const STORAGE_KEY_SYNC_CODE = 'zen_p2p_sync_code';

export function P2PProvider({ children, notes, onRemoteUpdateNote, onRemoteDeleteNote, onBulkSyncNotes }) {
  const [syncCode, setSyncCode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_SYNC_CODE) || '';
  });

  const [myPeerId, setMyPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeConnections, setActiveConnections] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Standby');

  const peerRef = useRef(null);
  const connectionsRef = useRef([]);

  // Generate or set sync code
  const updateSyncCode = (code) => {
    const clean = code.trim().toUpperCase();
    setSyncCode(clean);
    localStorage.setItem(STORAGE_KEY_SYNC_CODE, clean);
  };

  const generateRandomSyncCode = () => {
    const code = 'ZEN-' + Math.floor(100000 + Math.random() * 900000);
    updateSyncCode(code);
    return code;
  };

  // Initialize PeerJS when sync code exists
  useEffect(() => {
    if (!syncCode) {
      setIsConnected(false);
      setStatusMessage('P2P Standby');
      return;
    }

    setStatusMessage('Connecting to P2P network...');

    // Standard public PeerJS server
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setMyPeerId(id);
      setStatusMessage(`P2P Ready (Code: ${syncCode})`);
      setIsConnected(true);
    });

    peer.on('connection', (conn) => {
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.warn('P2P Peer error:', err);
      setStatusMessage('P2P Connection Error');
    });

    return () => {
      connectionsRef.current.forEach(c => c.close());
      connectionsRef.current = [];
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [syncCode]);

  // Setup connection handlers
  const setupConnection = (conn) => {
    conn.on('open', () => {
      if (!connectionsRef.current.some(c => c.peer === conn.peer)) {
        connectionsRef.current.push(conn);
        setActiveConnections([...connectionsRef.current]);
      }
      setStatusMessage(`Connected (${connectionsRef.current.length} Peer)`);

      // Exchange manifest upon opening connection
      sendManifest(conn);
    });

    conn.on('data', (data) => {
      handleIncomingP2PData(data, conn);
    });

    conn.on('close', () => {
      connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
      setActiveConnections([...connectionsRef.current]);
      if (connectionsRef.current.length === 0) {
        setStatusMessage(`P2P Ready (Code: ${syncCode})`);
      }
    });
  };

  // Connect to target remote Peer ID or Sync Room Target
  const connectToPeer = (targetPeerId) => {
    if (!peerRef.current || !targetPeerId) return;
    setStatusMessage('Pairing devices...');
    const conn = peerRef.current.connect(targetPeerId.trim());
    setupConnection(conn);
  };

  // Send note manifest to compare timestamps
  const sendManifest = (conn) => {
    const manifest = (notes || []).map(n => ({
      id: n.id,
      updatedAt: n.updatedAt,
      isTrash: n.isTrash
    }));
    conn.send({ type: 'MANIFEST', manifest });
  };

  // Handle incoming P2P messages
  const handleIncomingP2PData = (data, conn) => {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'MANIFEST': {
        const remoteManifest = data.manifest || [];
        const missingOrOutdated = [];

        // Check remote notes against local notes
        remoteManifest.forEach(remoteNote => {
          const localNote = (notes || []).find(n => n.id === remoteNote.id);
          if (!localNote || new Date(remoteNote.updatedAt) > new Date(localNote.updatedAt)) {
            missingOrOutdated.push(remoteNote.id);
          }
        });

        if (missingOrOutdated.length > 0) {
          conn.send({ type: 'REQUEST_NOTES', noteIds: missingOrOutdated });
        }

        // Send local notes that remote device is missing or outdated on
        const notesToPush = (notes || []).filter(localNote => {
          const remoteItem = remoteManifest.find(rm => rm.id === localNote.id);
          return !remoteItem || new Date(localNote.updatedAt) > new Date(remoteItem.updatedAt);
        });

        if (notesToPush.length > 0) {
          conn.send({ type: 'BULK_NOTE_UPDATE', notes: notesToPush });
        }
        break;
      }

      case 'REQUEST_NOTES': {
        const requestedIds = data.noteIds || [];
        const notesToSend = (notes || []).filter(n => requestedIds.includes(n.id));
        if (notesToSend.length > 0) {
          conn.send({ type: 'BULK_NOTE_UPDATE', notes: notesToSend });
        }
        break;
      }

      case 'NOTE_UPSERT': {
        if (data.note && onRemoteUpdateNote) {
          onRemoteUpdateNote(data.note);
        }
        break;
      }

      case 'BULK_NOTE_UPDATE': {
        if (data.notes && onBulkSyncNotes) {
          onBulkSyncNotes(data.notes);
        }
        break;
      }

      case 'NOTE_DELETE': {
        if (data.noteId && onRemoteDeleteNote) {
          onRemoteDeleteNote(data.noteId);
        }
        break;
      }

      default:
        break;
    }
  };

  // Broadcast note updates live over WebRTC
  const broadcastNoteUpdate = (note) => {
    connectionsRef.current.forEach(conn => {
      if (conn.open) {
        conn.send({ type: 'NOTE_UPSERT', note });
      }
    });
  };

  const broadcastNoteDelete = (noteId) => {
    connectionsRef.current.forEach(conn => {
      if (conn.open) {
        conn.send({ type: 'NOTE_DELETE', noteId });
      }
    });
  };

  return (
    <P2PContext.Provider
      value={{
        syncCode,
        updateSyncCode,
        generateRandomSyncCode,
        myPeerId,
        isConnected,
        activeConnections,
        statusMessage,
        connectToPeer,
        broadcastNoteUpdate,
        broadcastNoteDelete
      }}
    >
      {children}
    </P2PContext.Provider>
  );
}

export const useP2P = () => useContext(P2PContext);
