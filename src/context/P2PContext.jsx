import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';

const P2PContext = createContext();

const STORAGE_KEY_SYNC_CODE = 'zen_p2p_sync_code';

export function P2PProvider({ children }) {
  const [syncCode, setSyncCode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_SYNC_CODE) || 'ZEN-ROOM';
  });

  const [myPeerId, setMyPeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeConnections, setActiveConnections] = useState([]);
  const [statusMessage, setStatusMessage] = useState('P2P Standby');

  const peerRef = useRef(null);
  const connectionsRef = useRef([]);
  const remoteHandlersRef = useRef({
    onRemoteUpdateNote: null,
    onRemoteDeleteNote: null,
    onBulkSyncNotes: null
  });

  const setRemoteHandlers = (handlers) => {
    remoteHandlersRef.current = { ...remoteHandlersRef.current, ...handlers };
  };

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

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setMyPeerId(id);
      setStatusMessage(`P2P Ready`);
      setIsConnected(true);
    });

    peer.on('connection', (conn) => {
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.warn('P2P Peer error:', err);
      setStatusMessage('P2P Standby');
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
    });

    conn.on('data', (data) => {
      handleIncomingP2PData(data, conn);
    });

    conn.on('close', () => {
      connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
      setActiveConnections([...connectionsRef.current]);
      if (connectionsRef.current.length === 0) {
        setStatusMessage('P2P Ready');
      }
    });
  };

  // Connect to target remote Peer ID
  const connectToPeer = (targetPeerId) => {
    if (!peerRef.current || !targetPeerId) return;
    setStatusMessage('Pairing devices...');
    const conn = peerRef.current.connect(targetPeerId.trim());
    setupConnection(conn);
  };

  // Handle incoming P2P messages
  const handleIncomingP2PData = (data) => {
    if (!data || !data.type) return;
    const handlers = remoteHandlersRef.current;

    switch (data.type) {
      case 'NOTE_UPSERT': {
        if (data.note && handlers.onRemoteUpdateNote) {
          handlers.onRemoteUpdateNote(data.note);
        }
        break;
      }

      case 'BULK_NOTE_UPDATE': {
        if (data.notes && handlers.onBulkSyncNotes) {
          handlers.onBulkSyncNotes(data.notes);
        }
        break;
      }

      case 'NOTE_DELETE': {
        if (data.noteId && handlers.onRemoteDeleteNote) {
          handlers.onRemoteDeleteNote(data.noteId);
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
        broadcastNoteDelete,
        setRemoteHandlers
      }}
    >
      {children}
    </P2PContext.Provider>
  );
}

export const useP2P = () => useContext(P2PContext);
