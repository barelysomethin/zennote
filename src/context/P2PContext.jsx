import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';

const P2PContext = createContext();

const STORAGE_KEY_PEER_ID = 'zen_persistent_peer_id';
const STORAGE_KEY_PAIRED_PEERS = 'zen_paired_peer_ids';

export function P2PProvider({ children }) {
  // Get or create a persistent device peer ID for this browser
  const [myPeerId, setMyPeerId] = useState(() => {
    let stored = localStorage.getItem(STORAGE_KEY_PEER_ID);
    if (!stored) {
      stored = 'zen-' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(STORAGE_KEY_PEER_ID, stored);
    }
    return stored;
  });

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

  // Sync pairedPeers to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PAIRED_PEERS, JSON.stringify(pairedPeers));
    } catch (e) {}
  }, [pairedPeers]);

  // Initialize PeerJS with persistent custom Peer ID
  useEffect(() => {
    if (!myPeerId) return;

    setStatusMessage('Connecting to P2P network...');

    // Initialize with fixed persistent ID
    const peer = new Peer(myPeerId);
    peerRef.current = peer;

    peer.on('open', (id) => {
      setStatusMessage(`P2P Ready`);
      setIsConnected(true);

      // Auto reconnect to saved paired peers upon reload
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
      // If ID unavailable/taken temporarily, fallback gracefully
      if (err.type === 'unavailable-id') {
        const fallbackId = 'zen-' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem(STORAGE_KEY_PEER_ID, fallbackId);
        setMyPeerId(fallbackId);
      } else {
        console.warn('P2P Peer error:', err);
        setStatusMessage('P2P Standby');
      }
    });

    return () => {
      connectionsRef.current.forEach(c => c.close());
      connectionsRef.current = [];
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [myPeerId]);

  // Setup connection handlers
  const setupConnection = (conn) => {
    conn.on('open', () => {
      if (!connectionsRef.current.some(c => c.peer === conn.peer)) {
        connectionsRef.current.push(conn);
        setActiveConnections([...connectionsRef.current]);
      }
      setStatusMessage(`Connected (${connectionsRef.current.length} Peer)`);

      // Add to paired peers list
      setPairedPeers(prev => {
        if (!prev.includes(conn.peer)) return [...prev, conn.peer];
        return prev;
      });
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

    // Avoid duplicate connections
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
