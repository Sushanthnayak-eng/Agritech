import React, { useState, useEffect } from 'react';
import { User, Notification } from './types';
import {
  auth,
  db,
  usersCollection,
  notificationsCollection,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from './db/firebase';
import Navbar from './components/Navbar';
import Feed from './pages/Feed';
import Messaging from './pages/Messaging';
import Jobs from './pages/Jobs';
import Auth from './pages/Auth';
import Network from './pages/Network';
import SearchResults from './pages/SearchResults';
import Quiz from './pages/Quiz';
import BhoomiChat from './components/BhoomiChat';
import { Camera, Edit2, Check, X, Bell, User as UserIcon, Heart, MessageSquare, UserPlus, Briefcase, MapPin, Layout, MessageCircle, Repeat } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Listen for auth state changes and user profile updates
  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, listen to their profile real-time
        if (userUnsubscribe) userUnsubscribe();

        userUnsubscribe = onSnapshot(doc(usersCollection, firebaseUser.uid), (snapshot) => {
          if (snapshot.exists()) {
            setCurrentUser({ ...snapshot.data(), id: firebaseUser.uid } as User);
          }
        }, (error) => {
          console.error("Error listening to user doc:", error);
        });
      } else {
        // User is signed out
        if (userUnsubscribe) {
          userUnsubscribe();
          userUnsubscribe = null;
        }
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, []);

  // Listen for notifications
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const q = query(
      notificationsCollection,
      where('userId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ ...doc.data(), id: doc.id } as Notification);
      });
      // Sort in-memory to avoid index requirement
      notifs.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(notifs);
    }, (error) => {
      console.error("Error listening to notifications:", error);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setActiveTab('feed');
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;

    try {
      await updateDoc(doc(usersCollection, currentUser.id), editForm);
      // Local state will be updated by the onSnapshot listener
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'profilePhoto' | 'coverPhoto') => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 800KB for base64 to stay safely under Firestore 1MB limit)
      if (file.size > 800 * 1024) {
        alert("Image is too large. Please select an image smaller than 800KB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (currentUser) {
          try {
            await updateDoc(doc(usersCollection, currentUser.id), { [field]: base64 });
            // Sync editForm to prevent overwrite when clicking 'Save' later
            if (isEditingProfile) {
              setEditForm(prev => ({ ...prev, [field]: base64 }));
            }
          } catch (error: any) {
            console.error('Error uploading image:', error);
            if (error.code === 'permission-denied') {
              alert('Permission denied. Please make sure you are logged in.');
            } else {
              alert('Failed to upload image. Document size might be exceeded or rules rejected it.');
            }
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const markNotificationsAsRead = async () => {
    if (currentUser) {
      const unreadNotifs = notifications.filter(n => !n.isRead);
      for (const notif of unreadNotifs) {
        await updateDoc(doc(notificationsCollection, notif.id), { isRead: true });
      }
    }
  };


  useEffect(() => {
    if (activeTab === 'notifications') {
      markNotificationsAsRead();
    }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-agri-light">
        <div className="flex flex-col items-center">
          <div className="bg-agri-green text-white px-4 py-2 rounded-lg font-black text-4xl animate-pulse shadow-xl">Ag</div>
          <p className="mt-4 text-agri-green font-bold tracking-tight">CULTIVATING YOUR NETWORK...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-agri-light pb-10">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <main className="container mx-auto pt-14">
        {activeTab === 'feed' && <Feed currentUser={currentUser} />}
        {activeTab === 'messaging' && <Messaging currentUser={currentUser} selectedChatUserId={selectedChatUserId} setSelectedChatUserId={setSelectedChatUserId} />}
        {activeTab === 'jobs' && <Jobs currentUser={currentUser} setActiveTab={setActiveTab} setSelectedChatUserId={setSelectedChatUserId} />}
        {activeTab === 'network' && <Network currentUser={currentUser} />}
        {activeTab === 'search' && <SearchResults searchQuery={searchQuery} currentUser={currentUser} />}
        {activeTab === 'quiz' && <Quiz />}

        {activeTab === 'notifications' && (
          <div className="max-w-2xl mx-auto mt-6 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-black text-lg text-slate-800 uppercase tracking-tight">Notifications</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {notifications && notifications.length > 0 ? (
                notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    setActiveTab={setActiveTab}
                    setSelectedChatUserId={setSelectedChatUserId}
                  />
                ))
              ) : (
                <div className="p-16 text-center text-slate-500">
                  <Bell className="w-16 h-16 mx-auto mb-6 opacity-10" />
                  <p className="font-bold">Your dashboard is clear.</p>
                  <p className="text-xs text-slate-400 mt-1">Interactions from your farm network will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto mt-6 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="h-56 bg-slate-200 relative group overflow-hidden">
              <img
                src={currentUser.coverPhoto || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200'}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt="Cover"
              />
              <label className="absolute top-4 right-4 bg-white/90 p-2.5 rounded-full cursor-pointer hover:bg-white transition-all shadow-lg active:scale-95 group-hover:translate-y-0 translate-y-[-10px]">
                <Camera className="w-5 h-5 text-slate-700" />
                <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'coverPhoto')} />
              </label>

              <div className="absolute -bottom-16 left-8 p-1.5 bg-white rounded-full shadow-lg">
                <div className="relative group/avatar">
                  <img
                    src={currentUser.profilePhoto || 'https://via.placeholder.com/150'}
                    className="w-36 h-36 rounded-full border-4 border-white object-cover bg-white shadow-inner"
                    alt="Profile"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-all duration-300">
                    <Camera className="w-8 h-8 text-white" />
                    <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'profilePhoto')} />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-20 px-10 pb-10">
              {!isEditingProfile ? (
                <>
                  <div className="flex justify-between items-start">
                    <div className="max-w-md">
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">{currentUser.name}</h1>
                      <p className="text-lg text-slate-600 font-semibold mt-1">{currentUser.headline}</p>
                      <p className="text-sm text-slate-400 mt-2 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> {currentUser.location || 'Rural Region'}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEditForm(currentUser);
                          setIsEditingProfile(true);
                        }}
                        className="bg-agri-green text-white px-6 py-2.5 rounded-full font-black text-sm hover:bg-green-800 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" /> Update
                      </button>
                      <button onClick={handleLogout} className="border-2 border-red-100 text-red-500 px-6 py-2.5 rounded-full font-black text-sm hover:bg-red-50 transition-all active:scale-95">Logout</button>
                    </div>
                  </div>

                  <div className="mt-10">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">About My Farm</h2>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                      {currentUser.bio || "Share your farming philosophy, soil types, or seasonal goals with the community."}
                    </p>
                  </div>

                  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="text-[10px] text-slate-400 uppercase font-black mb-3 tracking-widest flex items-center gap-2">
                        <div className="w-1 h-3 bg-agri-green rounded-full"></div> Crops Grown
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentUser.cropsGrown.length > 0 ? currentUser.cropsGrown.map(c => (
                          <span key={c} className="bg-agri-green/10 text-agri-green px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">{c}</span>
                        )) : <span className="text-xs text-slate-400 font-medium italic">No crops listed yet.</span>}
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="text-[10px] text-slate-400 uppercase font-black mb-3 tracking-widest flex items-center gap-2">
                        <div className="w-1 h-3 bg-blue-500 rounded-full"></div> Land Detail
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Layout className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-base font-black text-slate-700">{currentUser.landArea || 'Size not specified'}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Modify Identity</h2>
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditingProfile(false)} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X className="w-6 h-6" /></button>
                      <button onClick={handleUpdateProfile} className="p-2.5 text-agri-green hover:bg-green-50 rounded-full transition-all"><Check className="w-6 h-6" /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                      <input
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none transition-all shadow-sm"
                        value={editForm.name || ''}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Professional Headline</label>
                      <input
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none transition-all shadow-sm"
                        value={editForm.headline || ''}
                        onChange={e => setEditForm({ ...editForm, headline: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">District / State</label>
                      <input
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none transition-all shadow-sm"
                        value={editForm.location || ''}
                        onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Farm / Organization Name</label>
                      <input
                        className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none transition-all shadow-sm"
                        value={editForm.farmName || ''}
                        onChange={e => setEditForm({ ...editForm, farmName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Farming Bio</label>
                    <textarea
                      rows={4}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none resize-none transition-all shadow-sm"
                      value={editForm.bio || ''}
                      onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Crops (comma separated)</label>
                    <input
                      placeholder="e.g. Rice, Wheat, Tomatoes"
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none transition-all shadow-sm"
                      value={editForm.cropsGrown?.join(', ') || ''}
                      onChange={e => setEditForm({ ...editForm, cropsGrown: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                    />
                  </div>

                  <button
                    onClick={handleUpdateProfile}
                    className="w-full bg-agri-green text-white font-black py-4 rounded-xl hover:bg-green-800 transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-sm"
                  >
                    Save All Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <BhoomiChat currentUser={currentUser} />
    </div>
  );
};

const NotificationItem: React.FC<{
  notification: Notification;
  setActiveTab: (tab: string) => void;
  setSelectedChatUserId: (id: string | null) => void;
}> = ({ notification, setActiveTab, setSelectedChatUserId }) => {
  const [actor, setActor] = useState<User | null>(null);

  const handleNotificationClick = async () => {
    // Mark as read immediately when clicked
    if (!notification.isRead) {
      await updateDoc(doc(notificationsCollection, notification.id), { isRead: true });
    }

    // Direct user based on notification type
    switch (notification.type) {
      case 'message':
        setSelectedChatUserId(notification.actorId);
        setActiveTab('messaging');
        break;
      case 'connection_request':
      case 'invitation':
        setActiveTab('network');
        break;
      case 'like':
      case 'comment':
      case 'repost':
        setActiveTab('feed');
        // In a more advanced version, we could scroll to the specific post using notification.linkId
        break;
      case 'job_alert':
        setActiveTab('jobs');
        break;
      default:
        setActiveTab('feed');
    }
  };

  useEffect(() => {
    const fetchActor = async () => {
      const actorDoc = await getDoc(doc(usersCollection, notification.actorId));
      if (actorDoc.exists()) {
        setActor({ ...actorDoc.data(), id: actorDoc.id } as User);
      }
    };
    fetchActor();
  }, [notification.actorId]);

  const getIcon = () => {
    switch (notification.type) {
      case 'like': return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'comment': return <MessageSquare className="w-5 h-5 text-blue-500 fill-blue-500" />;
      case 'connection_request': return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'job_alert': return <Briefcase className="w-5 h-5 text-agri-green" />;
      case 'message': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'repost': return <Repeat className="w-5 h-5 text-agri-green" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  if (!actor) return null;

  return (
    <div
      onClick={handleNotificationClick}
      className={`p-5 flex gap-5 items-start cursor-pointer hover:bg-slate-50 transition-colors ${!notification.isRead ? 'bg-agri-green/5' : ''}`}
    >
      <div className="relative">
        <img src={actor?.profilePhoto || 'https://via.placeholder.com/50'} className="w-14 h-14 rounded-full object-cover border border-slate-100 shadow-sm" alt="Actor" />
        <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md">
          {getIcon()}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-800 leading-relaxed">
          <span className="font-black text-slate-900">{actor?.name || 'A user'}</span> {notification.content}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{new Date(notification.timestamp).toLocaleString()}</span>
        </div>
      </div>
      {!notification.isRead && (
        <div className="w-2.5 h-2.5 rounded-full bg-agri-green mt-2 shadow-sm"></div>
      )}
    </div>
  );
};

export default App;