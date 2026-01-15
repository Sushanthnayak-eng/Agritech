
export interface User {
  id: string;
  name: string;
  email: string;
  farmName?: string;
  organization?: string;
  location: string;
  cropsGrown: string[];
  landArea?: string;
  equipment?: string[];
  experience: number;
  certifications: string[];
  profilePhoto?: string;
  coverPhoto?: string;
  headline: string;
  bio: string;
  isExpert: boolean;
  expertField?: 'Soil Science' | 'Agronomy' | 'Irrigation' | 'Livestock' | 'Policy';
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrl?: string;
  timestamp: number;
  likesCount: number;
  commentsCount: number;
  repostsCount?: number;
  originalPostId?: string;
  repostedBy?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  timestamp: number;
}

export interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'ignored';
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  mediaUrl?: string; // Add this
  timestamp: number;
  isRead: boolean;
}

export interface Job {
  id: string;
  authorId: string; // The person who posted the job
  title: string;
  company: string;
  location: string;
  description: string;
  salaryRange?: string;
  type: 'Full-time' | 'Seasonal' | 'Contract';
  postedAt: number;
  cropFocus?: string;
}

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
}

export interface Notification {
  id: string;
  userId: string; // recipient
  actorId: string; // person who triggered it
  type: 'connection_request' | 'like' | 'comment' | 'message' | 'invitation' | 'job_alert' | 'repost';
  content: string;
  isRead: boolean;
  timestamp: number;
  linkId?: string; // Optional ID to link to a post or job
}
