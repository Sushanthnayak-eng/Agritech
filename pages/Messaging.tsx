import React, { useState, useEffect, useRef } from 'react';
import { Search, MoreHorizontal, Send, Image as ImageIcon, Smile, ShieldAlert, MessageCircle } from 'lucide-react';
import {
  db,
  usersCollection,
  messagesCollection,
  connectionsCollection,
  notificationsCollection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs
} from '../db/firebase';
import { User, Message, Connection, Notification } from '../types';

interface MessagingProps {
  currentUser: User;
  selectedChatUserId?: string | null;
  setSelectedChatUserId?: (id: string | null) => void;
}

const Messaging: React.FC<MessagingProps> = ({ currentUser, selectedChatUserId, setSelectedChatUserId }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [msgInput, setMsgInput] = useState('');
  const [acceptedConnections, setAcceptedConnections] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync prop with local state
  useEffect(() => {
    if (selectedChatUserId) {
      const fetchSelectedUser = async () => {
        const userDoc = await getDoc(doc(usersCollection, selectedChatUserId));
        if (userDoc.exists()) {
          setSelectedUser({ ...userDoc.data(), id: userDoc.id } as User);
        }
      };
      fetchSelectedUser();

      // Clear the prop once synced so it doesn't force re-selection
      if (setSelectedChatUserId) {
        setSelectedChatUserId(null);
      }
    }
  }, [selectedChatUserId]);

  // Fetch accepted connections and their data real-time
  useEffect(() => {
    const q1 = query(connectionsCollection, where('requesterId', '==', currentUser.id), where('status', '==', 'accepted'));
    const q2 = query(connectionsCollection, where('receiverId', '==', currentUser.id), where('status', '==', 'accepted'));

    let connections1: any[] = [];
    let connections2: any[] = [];
    let usersUnsubscribe: (() => void) | null = null;

    const syncUsers = (c1: any[], c2: any[]) => {
      const connectedUserIds = [
        ...c1.map(d => d.data().receiverId),
        ...c2.map(d => d.data().requesterId)
      ];
      const uniqueIds = [...new Set(connectedUserIds)];

      if (usersUnsubscribe) usersUnsubscribe();

      if (uniqueIds.length > 0) {
        // Listen to all relevant users
        // Note: For large numbers of users, we'd need a different approach
        const usersQuery = query(usersCollection, where('__name__', 'in', uniqueIds.slice(0, 10))); // Firestore 'in' limit is 10
        usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
          const users: User[] = [];
          snapshot.forEach(doc => {
            users.push({ ...doc.data(), id: doc.id } as User);
          });
          setAcceptedConnections(users);
        });
      } else {
        setAcceptedConnections([]);
      }
    };

    const unsub1 = onSnapshot(q1, (snap) => {
      connections1 = snap.docs;
      syncUsers(connections1, connections2);
    }, (error) => {
      console.error("Error listening to connections (q1):", error);
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      connections2 = snap.docs;
      syncUsers(connections1, connections2);
    }, (error) => {
      console.error("Error listening to connections (q2):", error);
    });

    return () => {
      unsub1();
      unsub2();
      if (usersUnsubscribe) usersUnsubscribe();
    };
  }, [currentUser.id]);

  // Real-time messages listener for selected conversation
  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    const q1 = query(
      messagesCollection,
      where('senderId', '==', currentUser.id),
      where('receiverId', '==', selectedUser.id)
    );

    const q2 = query(
      messagesCollection,
      where('senderId', '==', selectedUser.id),
      where('receiverId', '==', currentUser.id)
    );

    let messages1: Message[] = [];
    let messages2: Message[] = [];

    const handleMessagesUpdate = () => {
      const allMessages = [...messages1, ...messages2].sort((a, b) => a.timestamp - b.timestamp);
      setMessages(allMessages);
    };

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      messages1 = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Message));
      handleMessagesUpdate();
    }, (error) => {
      console.error("Error listening to messages (q1):", error);
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      messages2 = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Message));
      handleMessagesUpdate();
    }, (error) => {
      console.error("Error listening to messages (q2):", error);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [selectedUser, currentUser.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() || !selectedUser) return;

    try {
      // Note: We've relaxed the connection requirement to allow 'First Contact' for jobs/networking.
      // In a production app, you might want to add a rate limit or a 'Request to Chat' step here.

      const messageRef = doc(messagesCollection, crypto.randomUUID());
      const newMessage: Message = {
        id: messageRef.id,
        senderId: currentUser.id,
        receiverId: selectedUser.id,
        content: msgInput,
        timestamp: Date.now(),
        isRead: false
      };

      await setDoc(messageRef, newMessage);

      // Add notification for the recipient
      const notifRef = doc(notificationsCollection, crypto.randomUUID());
      const notif: Notification = {
        id: notifRef.id,
        userId: selectedUser.id,
        actorId: currentUser.id,
        type: 'message',
        content: 'sent you a new message.',
        isRead: false,
        timestamp: Date.now()
      };
      await setDoc(notifRef, notif);

      setMsgInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex h-[calc(100vh-100px)] mt-6 px-4 gap-6">
      {/* Left List: Only Connected Users */}
      <div className="w-full md:w-1/3 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Messaging</h2>
          <MoreHorizontal className="w-5 h-5 text-slate-500 cursor-pointer" />
        </div>
        <div className="p-3">
          <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input type="text" placeholder="Search connections" className="bg-transparent text-sm w-full outline-none placeholder:text-slate-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {(() => {
            const allListUsers = [...acceptedConnections];
            if (selectedUser && !allListUsers.some(u => u.id === selectedUser.id)) {
              allListUsers.unshift(selectedUser);
            }

            if (allListUsers.length > 0) {
              return allListUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-4 flex gap-3 cursor-pointer transition-all border-l-4 ${selectedUser?.id === user.id ? 'bg-agri-green/5 border-agri-green' : 'border-transparent hover:bg-slate-50'
                    }`}
                >
                  <img src={user.profilePhoto || 'https://via.placeholder.com/150'} className="w-12 h-12 rounded-full border border-slate-100 object-cover" alt={user.name} />
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-slate-800 truncate">{user.name}</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.headline}</p>
                  </div>
                </div>
              ));
            } else {
              return (
                <div className="p-10 text-center flex flex-col items-center">
                  <ShieldAlert className="w-12 h-12 text-slate-200 mb-3" />
                  <p className="text-sm font-bold text-slate-500">No active conversations</p>
                  <p className="text-[11px] text-slate-400 mt-2">Connect with farmers to start chatting.</p>
                </div>
              );
            }
          })()}
        </div>
      </div>

      {/* Right Chat */}
      <div className="hidden md:flex flex-1 bg-white border border-slate-200 rounded-lg flex-col overflow-hidden shadow-sm">
        {selectedUser ? (
          <>
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <img src={selectedUser.profilePhoto || 'https://via.placeholder.com/150'} className="w-10 h-10 rounded-full border border-slate-100 object-cover" alt={selectedUser.name} />
                <div>
                  <h2 className="font-bold text-sm text-slate-800 leading-none">{selectedUser.name}</h2>
                  <p className="text-[10px] text-agri-green font-bold mt-1">Online</p>
                </div>
              </div>
              <div className="flex gap-4">
                <MoreHorizontal className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-600" />
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#f9f9f9]">
              <div className="flex flex-col items-center py-8 mb-8">
                <img src={selectedUser.profilePhoto || 'https://via.placeholder.com/150'} className="w-24 h-24 rounded-full mb-3 border-4 border-white shadow-md object-cover" alt={selectedUser.name} />
                <h3 className="font-bold text-lg text-slate-800">{selectedUser.name}</h3>
                <p className="text-xs text-slate-500 text-center px-16 leading-relaxed">{selectedUser.headline}</p>
                <div className="mt-4 flex gap-2">
                  <button className="text-[10px] font-bold text-agri-green bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm hover:bg-slate-50 transition-colors">View Profile</button>
                </div>
              </div>

              {messages?.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all animate-in zoom-in-95 duration-200 ${msg.senderId === currentUser.id
                    ? 'bg-agri-green text-white rounded-br-none'
                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                    }`}>
                    {msg.content}
                    <p className={`text-[9px] mt-1.5 font-medium ${msg.senderId === currentUser.id ? 'text-white/70 text-right' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white">
              <div className="bg-slate-50 rounded-2xl p-2 border border-slate-200 focus-within:border-agri-green focus-within:ring-1 focus-within:ring-agri-green/20 transition-all">
                <textarea
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  placeholder="Share advice, updates, or photos..."
                  rows={2}
                  className="w-full bg-transparent outline-none text-sm px-3 py-1.5 resize-none placeholder:text-slate-400"
                />
                <div className="flex items-center justify-between mt-1 px-2 border-t border-slate-200 pt-2">
                  <div className="flex gap-4 text-slate-400">
                    <ImageIcon className="w-5 h-5 cursor-pointer hover:text-agri-green transition-colors" />
                    <Smile className="w-5 h-5 cursor-pointer hover:text-agri-green transition-colors" />
                  </div>
                  <button
                    type="submit"
                    disabled={!msgInput.trim()}
                    className="bg-agri-green text-white px-6 py-1.5 rounded-full text-xs font-black disabled:opacity-40 transition-all shadow-md active:scale-95 flex items-center gap-2"
                  >
                    <Send className="w-3 h-3" /> Send
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white">
            <div className="w-24 h-24 bg-agri-green/5 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="w-12 h-12 text-agri-green" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Farm Talk Inbox</h2>
            <p className="text-slate-500 mt-2 max-w-sm text-sm">
              Keep in touch with your connections. Send updates, share seasonal tips, or negotiate agri-deals directly.
            </p>
            <button
              onClick={() => (document.querySelector('[data-tab="network"]') as HTMLElement)?.click()}
              className="mt-8 bg-agri-green text-white px-8 py-2.5 rounded-full font-bold text-sm shadow-lg hover:bg-green-800 transition-all active:scale-95"
            >
              Find Connections
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messaging;
