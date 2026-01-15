import React, { useState, useEffect } from 'react';
import {
  db,
  usersCollection,
  connectionsCollection,
  notificationsCollection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  getDocs
} from '../db/firebase';
import { User, Connection, Notification } from '../types';
import { UserPlus, Users, UserCheck, BookOpen, Hash, UserCircle } from 'lucide-react';

interface NetworkProps {
  currentUser: User;
}

const Network: React.FC<NetworkProps> = ({ currentUser }) => {
  const [otherUsers, setOtherUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  // Fetch all other users
  useEffect(() => {
    const q = query(usersCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((doc) => {
        const userData = { ...doc.data(), id: doc.id } as User;
        if (userData.id !== currentUser.id) {
          users.push(userData);
        }
      });
      setOtherUsers(users);
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  // Fetch all connections involving current user
  useEffect(() => {
    const q1 = query(connectionsCollection, where('requesterId', '==', currentUser.id));
    const q2 = query(connectionsCollection, where('receiverId', '==', currentUser.id));

    let connections1: Connection[] = [];
    let connections2: Connection[] = [];

    const updateAll = () => {
      const merged = [...connections1];
      connections2.forEach(c2 => {
        if (!merged.find(m => m.id === c2.id)) {
          merged.push(c2);
        }
      });
      setConnections(merged);
    };

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      connections1 = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Connection));
      updateAll();
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      connections2 = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Connection));
      updateAll();
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [currentUser.id]);

  const handleConnect = async (receiverId: string) => {
    const existing = connections.find(c =>
      (c.requesterId === currentUser.id && c.receiverId === receiverId) ||
      (c.requesterId === receiverId && c.receiverId === currentUser.id)
    );

    if (existing) return;

    try {
      const connectionRef = doc(connectionsCollection, crypto.randomUUID());
      const connection: Connection = {
        id: connectionRef.id,
        requesterId: currentUser.id,
        receiverId: receiverId,
        status: 'pending',
        timestamp: Date.now()
      };
      await setDoc(connectionRef, connection);

      // Notification for request
      const notifRef = doc(notificationsCollection, crypto.randomUUID());
      const notif: Notification = {
        id: notifRef.id,
        userId: receiverId,
        actorId: currentUser.id,
        type: 'connection_request',
        content: 'sent you a connection request.',
        isRead: false,
        timestamp: Date.now()
      };
      await setDoc(notifRef, notif);
    } catch (error) {
      console.error('Error sending connection request:', error);
    }
  };

  const handleAccept = async (connectionId: string) => {
    try {
      const connRef = doc(connectionsCollection, connectionId);
      const connDoc = await getDoc(connRef);
      if (!connDoc.exists()) return;

      const conn = connDoc.data() as Connection;

      // 1. Update connection status
      await updateDoc(connRef, { status: 'accepted' });

      // 2. Clear notifications for the current user
      // We do this individually to avoid potential batch/permission edge cases
      const notifQuery = query(
        notificationsCollection,
        where('userId', '==', currentUser.id),
        where('actorId', '==', conn.requesterId),
        where('type', '==', 'connection_request')
      );

      const notifSnapshot = await getDocs(notifQuery);
      for (const nDoc of notifSnapshot.docs) {
        await updateDoc(doc(notificationsCollection, nDoc.id), { isRead: true });
      }

      // 3. Send acceptance notification to the original requester
      const notifId = crypto.randomUUID();
      const acceptanceNotif: Notification = {
        id: notifId,
        userId: conn.requesterId,
        actorId: currentUser.id,
        type: 'connection_request',
        content: 'accepted your connection request.',
        isRead: false,
        timestamp: Date.now()
      };

      await setDoc(doc(notificationsCollection, notifId), acceptanceNotif);

      console.log('Connection accepted and notifications handled.');
    } catch (error) {
      console.error('Error accepting connection:', error);
      alert('Failed to accept connection. Please check your internet or try again.');
    }
  };

  const handleIgnore = async (connectionId: string) => {
    try {
      await updateDoc(doc(connectionsCollection, connectionId), { status: 'ignored' });
    } catch (error) {
      console.error('Error ignoring connection:', error);
    }
  };

  const getConnectionStatus = (userId: string) => {
    const conn = connections.find(c => c.requesterId === userId || c.receiverId === userId);
    return conn ? { status: conn.status, isRequester: conn.requesterId === currentUser.id, id: conn.id } : null;
  };

  const pendingInvitations = connections.filter(c => c.receiverId === currentUser.id && c.status === 'pending');
  const actualConnectionsCount = connections.filter(c => c.status === 'accepted').length;

  const suggestedUsers = otherUsers.filter(u => {
    const conn = getConnectionStatus(u.id);
    return !conn; // Show those never seen
  });

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 mt-6 px-4">
      {/* Left Sidebar */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm sticky top-20">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Manage my network</h2>
          </div>
          <div className="p-2 space-y-1">
            <div className="w-full flex items-center justify-between p-2 rounded text-sm text-slate-600 font-medium">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-slate-400" /> Connections
              </div>
              <span className="font-bold">{actualConnectionsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Invitations Section */}
        {pendingInvitations.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Pending Invitations</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {pendingInvitations.map(invite => (
                <InvitationRow key={invite.id} connection={invite} onAccept={handleAccept} onIgnore={handleIgnore} />
              ))}
            </div>
          </div>
        )}

        {/* Suggested Network Section */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-800">AgriConnect Recommendations</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedUsers.map(user => {
              const conn = getConnectionStatus(user.id);
              if (conn?.status === 'accepted' || conn?.status === 'ignored') return null;

              return (
                <div key={user.id} className="border border-slate-200 rounded-lg flex flex-col h-full overflow-hidden hover:shadow-lg transition-all bg-white group">
                  <div className="h-16 bg-slate-100 relative overflow-hidden">
                    {user.coverPhoto ? (
                      <img src={user.coverPhoto} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-agri-green/10" />
                    )}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                      <img src={user.profilePhoto || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-full border-2 border-white object-cover bg-white shadow-sm" alt={user.name} />
                    </div>
                  </div>
                  <div className="pt-8 pb-4 px-4 text-center flex-1 flex flex-col items-center">
                    <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{user.name}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 min-h-[32px]">{user.headline}</p>
                    <p className="text-[10px] text-slate-400 mt-2">{user.location || 'Rural Region'}</p>
                  </div>
                  <div className="p-3 pt-0 mt-auto">
                    {conn?.status === 'pending' && conn.isRequester ? (
                      <button disabled className="w-full border border-slate-200 bg-slate-50 text-slate-400 font-bold text-sm py-1.5 rounded-full cursor-not-allowed">
                        Pending
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(user.id)}
                        className="w-full border-2 border-agri-green text-agri-green hover:bg-agri-green hover:text-white font-bold text-sm py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <UserPlus className="w-4 h-4" /> Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {suggestedUsers.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400">
                <UserCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="font-medium text-slate-600">Grow your network by inviting others!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InvitationRow: React.FC<{
  connection: Connection,
  onAccept: (id: string) => void,
  onIgnore: (id: string) => void
}> = ({ connection, onAccept, onIgnore }) => {
  const [sender, setSender] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchSender = async () => {
      const senderDoc = await getDoc(doc(usersCollection, connection.requesterId));
      if (senderDoc.exists()) {
        setSender({ ...senderDoc.data(), id: senderDoc.id } as User);
      }
    };
    fetchSender();
  }, [connection.requesterId]);

  if (!sender) return null;

  const handleAction = async (action: 'accept' | 'ignore') => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (action === 'accept') {
        await onAccept(connection.id);
      } else {
        await onIgnore(connection.id);
      }
    } catch (error) {
      console.error('Action failed:', error);
      setIsProcessing(false);
    }
    // Note: if successful, component unmounts so reset is optional
  };

  return (
    <div className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${isProcessing ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
      <div className="flex gap-3 items-center">
        <img src={sender.profilePhoto || 'https://via.placeholder.com/150'} className="w-14 h-14 rounded-full object-cover bg-white border border-slate-100" alt={sender.name} />
        <div>
          <h3 className="font-bold text-sm text-slate-800">{sender.name}</h3>
          <p className="text-[11px] text-slate-500 line-clamp-1">{sender.headline}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{sender.location || 'Farming District'}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleAction('ignore')}
          disabled={isProcessing}
          className="text-slate-500 font-bold text-xs hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
        >
          Ignore
        </button>
        <button
          onClick={() => handleAction('accept')}
          disabled={isProcessing}
          className="bg-agri-green text-white font-bold text-xs hover:bg-green-800 px-5 py-1.5 rounded-full shadow-sm transition-all active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Accept'}
        </button>
      </div>
    </div>
  );
};

export default Network;
