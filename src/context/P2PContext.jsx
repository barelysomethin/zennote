import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';

const P2PContext = createContext();

const STORAGE_KEY_PAIRED_PEERS = 'zen_paired_peer_ids';

export function P2PProvider({ children }) {
  const [myPeerId, setMyPeerId] = useState('');
  const [pairedPeers, setPairedPeers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAIRED_PEERS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isConnected, setIsConnected] = useState(false);
  const [activeConnections, setActiveConnections] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Connecting to P2P network...');

  const peerRef = useRef(null);
  const connectionsRef = useRef([]);
  const remoteHandlersRef = useRef({
    onRemoteUpdateNote: null,
    onRemoteDeleteNote: null,
    onBulkSyncNotes: null,
    getAllNotes: null
  });

  const setRemoteHandlers = (handlers) => {
    remoteHandlersRef.current = { ...remoteHandlersRef.current, ...handlers };
  };

  // Save pairedPeers to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PAIRED_PEERS, JSON.stringify(pairedPeers));
    } catch (e) {}
  }, [pairedPeers]);

  // Initialize PeerJS cleanly with Google STUN servers
  useEffect(() => {
    setStatusMessage('Connecting to P2P network...');

    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      setMyPeerId(id);
      setStatusMessage('P2P Ready');
      setIsConnected(true);

      // Auto connect to any previously paired peers
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_PAIRED_PEERS) || '[]');
      saved.forEach(remoteId => {
        if (remoteId && remoteId !== id) {
          connectToPeer(remoteId);
        }
      });
    });

    peer.on('connection', (conn) => {
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.warn('P2P error:', err);
      setStatusMessage('P2P Network Busy');
    });

    return () => {
      connectionsRef.current.forEach(c => c.close());
      connectionsRef.current = [];
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  // Setup connection handlers
  const setupConnection = (conn) => {
    conn.on('open', () => {
      if (!connectionsRef.current.some(c => c.peer === conn.peer)) {
        connectionsRef.current.push(conn);
        setActiveConnections([...connectionsRef.current]);
      }
      setStatusMessage(`Connected (${connectionsRef.current.length} Peer)`);

      // Remember paired peer ID
      setPairedPeers(prev => {
        if (!prev.includes(conn.peer)) return [...prev, conn.peer];
        return prev;
      });

      // Send current notes to newly connected peer
      if (remoteHandlersRef.current.getAllNotes) {
        const allNotes = remoteHandlersRef.current.getAllNotes();
        conn.send({ type: 'BULK_NOTE_UPDATE', notes: allNotes });
      }
    });

    conn.on('data', (data) => {
      handleIncomingP2PData(data);
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
    const cleanId = targetPeerId.trim();
    if (!peerRef.current || !cleanId || cleanId === myPeerId) return;

    if (connectionsRef.current.some(c => c.peer === cleanId)) return;

    setStatusMessage('Pairing devices...');
    const conn = peerRef.current.connect(cleanId);
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

  // Manual sync all notes across connected peers
  const syncAllNotes = () => {
    if (remoteHandlersRef.current.getAllNotes) {
      const allNotes = remoteHandlersRef.current.getAllNotes();
      connectionsRef.current.forEach(conn => {
        if (conn.open) {
          conn.send({ type: 'BULK_NOTE_UPDATE', notes: allNotes });
        }
      });
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
        myPeerId,
        pairedPeers,
        isConnected,
        activeConnections,
        statusMessage,
        connectToPeer,
        syncAllNotes,
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
