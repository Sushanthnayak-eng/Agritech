
import React from 'react';
import { Home, Users, Briefcase, MessageSquare, Bell, User, Search, Trophy } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: any;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, currentUser, searchQuery, setSearchQuery }) => {
  const navItems = [
    { id: 'feed', icon: Home, label: 'Home' },
    { id: 'network', icon: Users, label: 'My Network' },
    { id: 'quiz', icon: Trophy, label: 'Quiz' },
    { id: 'jobs', icon: Briefcase, label: 'Jobs' },
    { id: 'messaging', icon: MessageSquare, label: 'Messaging' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim() && activeTab !== 'search') {
      setActiveTab('search');
    } else if (!val.trim() && activeTab === 'search') {
      setActiveTab('feed');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="bg-agri-green text-white p-1 rounded font-bold text-xl leading-none">Ag</div>
          <div className="hidden md:flex items-center bg-slate-100 px-3 py-1.5 rounded-md w-full max-w-xs ml-2">
            <Search className="w-4 h-4 text-slate-500 mr-2" />
            <input
              type="text"
              placeholder="Search Farmers, Experts..."
              className="bg-transparent border-none focus:outline-none text-sm w-full"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center h-14 px-2 border-b-2 transition-colors ${activeTab === item.id ? 'border-agri-green text-agri-green' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] mt-1 hidden sm:block">{item.label}</span>
            </button>
          ))}

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center h-14 px-2 border-b-2 transition-colors ${activeTab === 'profile' ? 'border-agri-green text-agri-green' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
          >
            {currentUser?.profilePhoto ? (
              <img src={currentUser.profilePhoto} className="w-6 h-6 rounded-full border border-slate-200" alt="Me" />
            ) : (
              <User className="w-6 h-6" />
            )}
            <span className="text-[10px] mt-1 hidden sm:block">Me</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
