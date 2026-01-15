import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Video, Calendar, Layout, UserCircle, ChevronDown, X, PlusCircle } from 'lucide-react';
import {
  db,
  postsCollection,
  doc,
  setDoc,
  query,
  orderBy,
  onSnapshot
} from '../db/firebase';
import { Post, User } from '../types';
import PostCard from '../components/PostCard';

const Feed: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time posts listener
  useEffect(() => {
    const q = query(postsCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData: Post[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        postsData.push({
          ...data,
          id: doc.id,
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          repostsCount: data.repostsCount || 0
        } as Post);
      });
      // Sort in-memory to avoid index requirement
      postsData.sort((a, b) => b.timestamp - a.timestamp);
      setPosts(postsData);
    }, (error) => {
      console.error("Error listening to posts:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !selectedImage) return;

    try {
      const postRef = doc(postsCollection, crypto.randomUUID());
      const newPost: Post = {
        id: postRef.id,
        authorId: currentUser.id,
        content: postContent,
        mediaUrl: selectedImage || undefined,
        timestamp: Date.now(),
        likesCount: 0,
        commentsCount: 0,
      };

      await setDoc(postRef, newPost);
      setPostContent('');
      setSelectedImage(null);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 mt-20 px-4">
      {/* Profile Summary Sidebar */}
      <div className="hidden md:block">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm sticky top-20">
          <div className="h-14 bg-agri-green relative">
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <img src={currentUser.profilePhoto || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-full border-2 border-white object-cover bg-white shadow-sm" alt="Me" />
            </div>
          </div>
          <div className="pt-10 pb-4 px-4 text-center border-b border-slate-100">
            <h2 className="font-bold text-slate-800 line-clamp-1">{currentUser.name}</h2>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{currentUser.headline}</p>
          </div>
          <div className="p-3 space-y-3 text-[11px] font-bold text-slate-600 border-b border-slate-100">
            <div className="flex justify-between hover:bg-slate-50 p-2 rounded cursor-pointer transition-colors">
              <span className="text-slate-500">Network Growth</span>
              <span className="text-agri-green">Active</span>
            </div>
          </div>
          <div className="p-3 text-[11px] hover:bg-slate-50 cursor-pointer transition-colors">
            <p className="text-slate-400">Exclusive Agri-insights</p>
            <p className="font-bold text-slate-700 mt-0.5 underline">Try Premium</p>
          </div>
        </div>
      </div>

      {/* Main Feed Content */}
      <div className="space-y-4">
        {/* authenticated users posting flow */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex gap-4">
            <img src={currentUser.profilePhoto || 'https://via.placeholder.com/150'} className="w-12 h-12 rounded-full object-cover bg-white shadow-sm" alt="Me" />
            <div className="flex-1">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="w-full border-none focus:ring-0 text-sm resize-none min-h-[50px] placeholder:text-slate-400"
                placeholder="Share your farm update, soil test results, or marketplace news..."
              />

              {selectedImage && (
                <div className="relative mt-3 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                  <img src={selectedImage} className="w-full max-h-[300px] object-cover" alt="Upload preview" />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
            <div className="flex gap-1">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-slate-500 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                <ImageIcon className="text-blue-500 w-5 h-5" /> Photo
              </button>
              <button className="flex items-center gap-2 text-slate-500 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-semibold transition-all">
                <Video className="text-agri-green w-5 h-5" /> Video
              </button>
            </div>

            <button
              onClick={handleCreatePost}
              disabled={!postContent.trim() && !selectedImage}
              className="bg-agri-green text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-green-800 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md active:scale-95"
            >
              Post
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 my-4">
          <hr className="flex-1 border-slate-200" />
          <div className="text-[11px] flex items-center text-slate-400 font-bold uppercase tracking-wider">
            Feed <span className="mx-2">|</span> <span className="text-slate-900">Recent Updates</span> <ChevronDown className="w-3 h-3 ml-1" />
          </div>
        </div>

        {/* Real Post List */}
        <div className="space-y-4">
          {posts.length > 0 ? (
            posts.map(post => (
              <PostCard key={post.id} post={post} currentUser={currentUser} />
            ))
          ) : (
            <div className="text-center py-24 bg-white rounded-lg border border-slate-200 shadow-sm border-dashed">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <UserCircle className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-slate-800 font-bold text-lg">No Community Updates Yet</h3>
              <p className="text-slate-500 text-sm mt-2 px-16">
                Your feed is empty because there are no posts yet. Start the movement by sharing your first agricultural insight!
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="mt-8 flex items-center gap-2 mx-auto bg-agri-green text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg hover:bg-green-800 transition-all"
              >
                <PlusCircle className="w-5 h-5" /> Share First Post
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feed;
