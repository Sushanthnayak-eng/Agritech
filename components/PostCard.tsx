import React, { useState, useEffect } from 'react';
import { ThumbsUp, MessageSquare, Repeat, Send, MoreHorizontal } from 'lucide-react';
import { Post, User, Comment, Notification } from '../types';
import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  usersCollection,
  commentsCollection,
  likesCollection,
  postsCollection,
  notificationsCollection,
  increment,
  getDocs,
  writeBatch
} from '../db/firebase';

interface PostCardProps {
  post: Post;
  currentUser: User;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [author, setAuthor] = useState<User | null>(null);
  const [postComments, setPostComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeDocId, setLikeDocId] = useState<string | null>(null);
  const [reposter, setReposter] = useState<User | null>(null);
  const [livePost, setLivePost] = useState<Post>(post);

  // Sync live post statistics real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(postsCollection, post.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setLivePost({
          ...data,
          id: doc.id,
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          repostsCount: data.repostsCount || 0
        } as Post);
      }
    });
    return () => unsubscribe();
  }, [post.id]);

  // Handle prop updates
  useEffect(() => {
    setLivePost(post);
  }, [post]);

  // Listen to reposter if applicable
  useEffect(() => {
    if (post.repostedBy) {
      const unsubscribe = onSnapshot(doc(usersCollection, post.repostedBy), (doc) => {
        if (doc.exists()) {
          setReposter({ ...doc.data(), id: doc.id } as User);
        }
      });
      return () => unsubscribe();
    }
  }, [post.repostedBy]);

  // Listen to post author real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(usersCollection, post.authorId), (doc) => {
      if (doc.exists()) {
        setAuthor({ ...doc.data(), id: doc.id } as User);
      }
    });
    return () => unsubscribe();
  }, [post.authorId]);

  // Real-time comments listener
  useEffect(() => {
    const q = query(
      commentsCollection,
      where('postId', '==', post.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comments: Comment[] = [];
      snapshot.forEach((doc) => {
        comments.push({ ...doc.data(), id: doc.id } as Comment);
      });
      setPostComments(comments);
    });

    return () => unsubscribe();
  }, [post.id]);

  // Check if user has liked this post
  useEffect(() => {
    const q = query(
      likesCollection,
      where('postId', '==', post.id),
      where('userId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setIsLiked(true);
        setLikeDocId(snapshot.docs[0].id);
      } else {
        setIsLiked(false);
        setLikeDocId(null);
      }
    });

    return () => unsubscribe();
  }, [post.id, currentUser.id]);

  const handleLike = async () => {
    try {
      if (isLiked) {
        // Unlike
        const q = query(
          likesCollection,
          where('postId', '==', post.id),
          where('userId', '==', currentUser.id)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        batch.update(doc(postsCollection, post.id), {
          likesCount: increment(-1)
        });
        await batch.commit();
      } else {
        // Like
        const likeId = `${currentUser.id}_${post.id}`;
        const likeRef = doc(likesCollection, likeId);

        // Double check existence to prevent double increment on race condition
        const likeDoc = await getDoc(likeRef);
        if (likeDoc.exists()) return;

        const batch = writeBatch(db);
        batch.set(likeRef, {
          postId: post.id,
          userId: currentUser.id,
          timestamp: Date.now()
        });
        batch.update(doc(postsCollection, post.id), {
          likesCount: increment(1)
        });
        await batch.commit();

        // Notify author if it's not the currentUser's own post
        if (post.authorId !== currentUser.id) {
          const notifRef = doc(notificationsCollection, crypto.randomUUID());
          const notif: Notification = {
            id: notifRef.id,
            userId: post.authorId,
            actorId: currentUser.id,
            type: 'like',
            content: 'liked your post.',
            isRead: false,
            timestamp: Date.now()
          };
          await setDoc(notifRef, notif);
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const commentRef = doc(commentsCollection, crypto.randomUUID());
      const newComment: Comment = {
        id: commentRef.id,
        postId: post.id,
        authorId: currentUser.id,
        content: commentText,
        timestamp: Date.now()
      };

      await setDoc(commentRef, newComment);
      await updateDoc(doc(postsCollection, post.id), {
        commentsCount: increment(1)
      });

      // Notify author if not self
      if (post.authorId !== currentUser.id) {
        const notifRef = doc(notificationsCollection, crypto.randomUUID());
        const notif: Notification = {
          id: notifRef.id,
          userId: post.authorId,
          actorId: currentUser.id,
          type: 'comment',
          content: `commented on your post: "${commentText.substring(0, 30)}${commentText.length > 30 ? '...' : ''}"`,
          isRead: false,
          timestamp: Date.now()
        };
        await setDoc(notifRef, notif);
      }

      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleRepost = async () => {
    try {
      const postRef = doc(postsCollection, crypto.randomUUID());
      const newPost: Post = {
        id: postRef.id,
        authorId: post.authorId,
        content: post.content,
        mediaUrl: post.mediaUrl,
        timestamp: Date.now(),
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        originalPostId: post.originalPostId || post.id,
        repostedBy: currentUser.id
      };

      await setDoc(postRef, newPost);

      // Update original post repost count
      await updateDoc(doc(postsCollection, post.id), {
        repostsCount: increment(1)
      });

      // Notify author if not self
      if (post.authorId !== currentUser.id) {
        const notifRef = doc(notificationsCollection, crypto.randomUUID());
        const notif: Notification = {
          id: notifRef.id,
          userId: post.authorId,
          actorId: currentUser.id,
          type: 'repost',
          content: 'reposted your post.',
          isRead: false,
          timestamp: Date.now(),
          linkId: post.id
        };
        await setDoc(notifRef, notif);
      }
      alert('Post shared to your network!');
    } catch (error) {
      console.error('Error reposting:', error);
    }
  };

  if (!author) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-4 overflow-hidden">
      <div className="p-3 flex items-start justify-between">
        <div className="flex gap-2">
          <img
            src={(reposter || author).profilePhoto || 'https://via.placeholder.com/150'}
            className="w-12 h-12 rounded-full object-cover bg-white border border-slate-100 shadow-sm"
            alt={(reposter || author).name}
          />
          <div>
            <div className="flex items-center flex-wrap gap-1">
              <h3 className="font-bold text-sm hover:text-agri-green hover:underline cursor-pointer transition-colors">
                {reposter ? (reposter.id === currentUser.id ? 'You' : reposter.name) : author.name}
              </h3>
              {reposter && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                  <Repeat className="w-2.5 h-2.5" />
                  <span>reposted from</span>
                  <span className="font-bold text-agri-green hover:underline cursor-pointer">{author.name}</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">{(reposter || author).headline}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(post.timestamp).toLocaleDateString()}</p>
          </div>
        </div>
        <button className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-full transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
      </div>

      <div className="px-3 pb-3 text-sm text-slate-800 whitespace-pre-wrap">
        {post.content}
      </div>

      {post.mediaUrl && (
        <div className="w-full bg-slate-50 border-y border-slate-100">
          <img src={post.mediaUrl} className="w-full max-h-[500px] object-contain mx-auto" alt="Post media" />
        </div>
      )}

      <div className="px-3 py-2 flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="bg-blue-100 p-0.5 rounded-full"><ThumbsUp className="w-2.5 h-2.5 text-linkedin-blue fill-linkedin-blue" /></div>
            <span>{livePost.likesCount || 0} likes</span>
          </div>
          {livePost.repostsCount && livePost.repostsCount > 0 ? (
            <div className="flex items-center gap-1">
              <Repeat className="w-3 h-3 text-slate-400" />
              <span>{livePost.repostsCount} reposts</span>
            </div>
          ) : null}
        </div>
        <div>{livePost.commentsCount || 0} comments</div>
      </div>

      <div className="px-1 py-1 flex items-center justify-around border-b border-slate-100">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-all hover:bg-slate-50 text-xs sm:text-sm font-bold active:scale-95 ${isLiked ? 'text-linkedin-blue' : 'text-slate-600'}`}
        >
          <ThumbsUp className={`w-5 h-5 transition-transform ${isLiked ? 'fill-linkedin-blue' : 'group-hover:scale-110'}`} /> Like
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors hover:bg-slate-50 text-xs sm:text-sm font-bold ${showComments ? 'text-agri-green bg-green-50' : 'text-slate-600'}`}
        >
          <MessageSquare className="w-5 h-5" /> Comment
        </button>
        <button
          onClick={handleRepost}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-600"
        >
          <Repeat className={`w-5 h-5 ${livePost.repostedBy === currentUser.id ? 'text-agri-green' : ''}`} /> Repost
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-600">
          <Send className="w-5 h-5" /> Send
        </button>
      </div>

      {showComments && (
        <div className="p-3 bg-slate-50 rounded-b-lg">
          <div className="flex gap-2 mb-4">
            <img src={currentUser.profilePhoto || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full border border-slate-200" alt="Me" />
            <form onSubmit={handleComment} className="flex-1">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full bg-white border border-slate-300 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:border-agri-green transition-all"
              />
            </form>
          </div>

          <div className="space-y-3">
            {postComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => {
  const [author, setAuthor] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(usersCollection, comment.authorId), (doc) => {
      if (doc.exists()) {
        setAuthor({ ...doc.data(), id: doc.id } as User);
      }
    });
    return () => unsubscribe();
  }, [comment.authorId]);

  if (!author) return null;

  return (
    <div className="flex gap-2">
      <img src={author.profilePhoto || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full border border-slate-200 object-cover" alt={author.name} />
      <div className="flex-1 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-[12px] text-slate-800">{author.name}</span>
          <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-[12px] text-slate-700 leading-snug">{comment.content}</p>
      </div>
    </div>
  );
};

export default PostCard;
