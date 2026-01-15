
import React, { useState, useEffect } from 'react';
import { User, Post } from '../types';
import {
    db,
    usersCollection,
    postsCollection,
    query,
    where,
    getDocs,
    onSnapshot
} from '../db/firebase';
import PostCard from '../components/PostCard';
import { UserCircle, Search, Users, Layout } from 'lucide-react';

interface SearchResultsProps {
    searchQuery: string;
    currentUser: User;
}

const SearchResults: React.FC<SearchResultsProps> = ({ searchQuery, currentUser }) => {
    const [userResults, setUserResults] = useState<User[]>([]);
    const [postResults, setPostResults] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setUserResults([]);
            setPostResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const lowerQuery = searchQuery.toLowerCase();

        // 1. Search Users (Client-side filtering for simplicity and better UX with small/medium datasets)
        const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
            const users: User[] = [];
            snapshot.forEach((doc) => {
                const u = { ...doc.data(), id: doc.id } as User;
                if (
                    u.id !== currentUser.id &&
                    (u.name.toLowerCase().includes(lowerQuery) ||
                        u.headline.toLowerCase().includes(lowerQuery) ||
                        u.bio?.toLowerCase().includes(lowerQuery) ||
                        u.location?.toLowerCase().includes(lowerQuery))
                ) {
                    users.push(u);
                }
            });
            setUserResults(users);
        });

        // 2. Search Posts
        const unsubscribePosts = onSnapshot(postsCollection, (snapshot) => {
            const posts: Post[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                const p = {
                    ...data,
                    id: doc.id,
                    likesCount: data.likesCount || 0,
                    commentsCount: data.commentsCount || 0,
                    repostsCount: data.repostsCount || 0
                } as Post;
                if (p.content.toLowerCase().includes(lowerQuery)) {
                    posts.push(p);
                }
            });
            posts.sort((a, b) => b.timestamp - a.timestamp);
            setPostResults(posts);
            setIsLoading(false);
        });

        return () => {
            unsubscribeUsers();
            unsubscribePosts();
        };
    }, [searchQuery, currentUser.id]);

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto mt-20 p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-agri-green mx-auto"></div>
                <p className="mt-4 text-slate-500 font-medium">Searching the fields...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto mt-20 px-4 pb-20">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <Search className="w-6 h-6 text-agri-green" />
                    Results for "{searchQuery}"
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Found {userResults.length} people and {postResults.length} posts
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_250px] gap-8">
                <div className="space-y-8">
                    {/* Posts Results */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                            <Layout className="w-5 h-5 text-agri-green" />
                            <h2 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Post Updates</h2>
                        </div>

                        {postResults.length > 0 ? (
                            <div className="space-y-4">
                                {postResults.map(post => (
                                    <PostCard key={post.id} post={post} currentUser={currentUser} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-slate-200 border-dashed p-10 text-center">
                                <p className="text-slate-400 text-sm">No post matches found.</p>
                            </div>
                        )}
                    </section>
                </div>

                <div className="space-y-8">
                    {/* People Results */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                            <Users className="w-5 h-5 text-agri-green" />
                            <h2 className="font-bold text-slate-800 uppercase text-xs tracking-widest">People</h2>
                        </div>

                        {userResults.length > 0 ? (
                            <div className="space-y-3">
                                {userResults.map(user => (
                                    <div key={user.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3 hover:shadow-md transition-shadow">
                                        <img
                                            src={user.profilePhoto || 'https://via.placeholder.com/150'}
                                            className="w-10 h-10 rounded-full object-cover border border-slate-100"
                                            alt={user.name}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-sm text-slate-800 truncate">{user.name}</h3>
                                            <p className="text-[10px] text-slate-500 truncate">{user.headline}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-slate-200 border-dashed p-6 text-center">
                                <p className="text-slate-400 text-[10px]">No people found.</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {!searchQuery.trim() && (
                <div className="text-center py-20">
                    <Search className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h2 className="text-slate-800 font-bold text-lg">Type something to search</h2>
                    <p className="text-slate-500 text-sm mt-2">Find farmers, experts, or community updates.</p>
                </div>
            )}
        </div>
    );
};

export default SearchResults;
