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
  getDocs,
  uploadImage
} from '../db/firebase';
import { User, Message, Connection, Notification } from '../types';
import { X, CheckCircle2 } from 'lucide-react';

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
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emojis = ['🌾', '🚜', '🌱', '🍎', '🐄', '🥛', '🥕', '🥔', '🍅', '🐔', '🍯', '🌿', '💧', '☀️', '🌍', '🤝', '😊', '👍', '🙏', '💯', '🔥', '✨', '👏', '✅', '📍', '🚚', '📊', '💰', '🕙', '📩'];

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmoji = (emoji: string) => {
    setMsgInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || (!msgInput.trim() && !selectedImage)) return;

    try {
      let mediaUrl = '';
      if (selectedImage) {
        setIsUploading(true);
        // Using Base64 to bypass the Firebase Storage 'Upgrade' requirement
        const { fileToBase64 } = await import('../db/firebase');
        mediaUrl = await fileToBase64(selectedImage);
        setIsUploading(false);
      }

      const messageRef = doc(messagesCollection, crypto.randomUUID());
      const newMessage: Message = {
        id: messageRef.id,
        senderId: currentUser.id,
        receiverId: selectedUser.id,
        content: msgInput,
        mediaUrl: mediaUrl || undefined,
        timestamp: Date.now(),
        isRead: false
      };

      await setDoc(messageRef, newMessage);
      setSelectedImage(null);
      setImagePreview(null);

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
      setIsUploading(false);
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

            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#efeae2] relative" style={{ backgroundImage: 'radial-gradient(#d1d1d1 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}>
              <div className="flex flex-col items-center py-8 mb-8 relative z-10">
                <img src={selectedUser.profilePhoto || 'https://via.placeholder.com/150'} className="w-24 h-24 rounded-full mb-3 border-4 border-white shadow-md object-cover" alt={selectedUser.name} />
                <h3 className="font-bold text-lg text-slate-800">{selectedUser.name}</h3>
                <p className="text-xs text-slate-500 text-center px-16 leading-relaxed">{selectedUser.headline}</p>
              </div>

              {messages?.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'} relative z-10`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-1.5 text-sm shadow-sm transition-all animate-in zoom-in-95 duration-200 ${msg.senderId === currentUser.id
                    ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none'
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                    }`}>
                    {msg.mediaUrl && (
                      <div className="mb-1 rounded-lg overflow-hidden border border-black/5">
                        <img src={msg.mediaUrl} className="w-full max-w-sm cursor-pointer hover:opacity-95" alt="Message attachment" />
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.senderId === currentUser.id && (
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isUploading && (
                <div className="flex justify-end">
                  <div className="bg-agri-green/10 text-agri-green text-xs px-4 py-2 rounded-2xl animate-pulse flex items-center gap-2">
                    <div className="w-2 h-2 bg-agri-green rounded-full animate-bounce"></div> Uploading image...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white">
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img src={imagePreview} className="h-20 w-20 object-cover rounded-lg border border-slate-200" alt="Preview" />
                  <button
                    onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="bg-slate-50 rounded-2xl p-2 border border-slate-200 focus-within:border-agri-green focus-within:ring-1 focus-within:ring-agri-green/20 transition-all">
                <textarea
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  placeholder="Share advice, updates, or photos..."
                  rows={2}
                  className="w-full bg-transparent outline-none text-sm px-3 py-1.5 resize-none placeholder:text-slate-400"
                />
                <div className="flex items-center justify-between mt-1 px-2 border-t border-slate-200 pt-2">
                  <div className="flex gap-4 text-slate-400 relative">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    <ImageIcon
                      onClick={() => fileInputRef.current?.click()}
                      className="w-5 h-5 cursor-pointer hover:text-agri-green transition-colors"
                    />
                    <div className="relative">
                      <Smile
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`w-5 h-5 cursor-pointer hover:text-agri-green transition-colors ${showEmojiPicker ? 'text-agri-green' : ''}`}
                      />
                      {showEmojiPicker && (
                        <div className="absolute bottom-8 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-3 grid grid-cols-6 gap-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 w-64">
                          {emojis.map(e => (
                            <button
                              key={e}
                              onClick={() => addEmoji(e)}
                              type="button"
                              className="text-2xl hover:bg-slate-100 p-1 rounded transition-colors"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={(!msgInput.trim() && !selectedImage) || isUploading}
                    className="bg-agri-green text-white px-6 py-1.5 rounded-full text-xs font-black disabled:opacity-40 transition-all shadow-md active:scale-95 flex items-center gap-2"
                  >
                    {isUploading ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : <Send className="w-3 h-3" />}
                    {isUploading ? 'Sending...' : 'Send'}
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
