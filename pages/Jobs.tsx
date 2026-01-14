import React, { useState, useEffect } from 'react';
import {
  db,
  jobsCollection,
  savedJobsCollection,
  usersCollection,
  notificationsCollection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from '../db/firebase';
import { Job, User, SavedJob, Notification } from '../types';
import { Briefcase, MapPin, Search, Bell, Bookmark, Plus, X, CheckCircle, Info, ChevronRight } from 'lucide-react';

interface JobsProps {
  currentUser: User;
}

const Jobs: React.FC<JobsProps> = ({ currentUser }) => {
  const [filter, setFilter] = useState<'recommended' | 'my-jobs' | 'saved'>('recommended');
  const [showPostModal, setShowPostModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [savedJobRecords, setSavedJobRecords] = useState<SavedJob[]>([]);
  const [newJob, setNewJob] = useState<Partial<Job>>({
    type: 'Full-time',
  });

  // Fetch all jobs with real-time updates
  useEffect(() => {
    const q = query(jobsCollection, orderBy('postedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs: Job[] = [];
      snapshot.forEach((doc) => {
        jobs.push({ ...doc.data(), id: doc.id } as Job);
      });
      setAllJobs(jobs);
    });

    return () => unsubscribe();
  }, []);

  // Fetch saved jobs
  useEffect(() => {
    const q = query(savedJobsCollection, where('userId', '==', currentUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const saved: SavedJob[] = [];
      snapshot.forEach((doc) => {
        saved.push({ ...doc.data(), id: doc.id } as SavedJob);
      });
      setSavedJobRecords(saved);
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  const savedJobsList = allJobs.filter(j => savedJobRecords.some(sj => sj.jobId === j.id));
  const myJobsList = allJobs.filter(j => j.authorId === currentUser.id);

  // Basic Recommendation Engine: Matches location or crops grown
  const recommendedJobs = allJobs.filter(job => {
    const jobText = (job.title + job.company + job.description + (job.cropFocus || "")).toLowerCase();
    const userLoc = currentUser.location?.toLowerCase() || "";

    const matchesLocation = job.location.toLowerCase().includes(userLoc);
    const matchesCrops = currentUser.cropsGrown.some(crop =>
      jobText.includes(crop.toLowerCase())
    );
    return matchesLocation || matchesCrops;
  });

  const filteredJobs = (jobs: Job[]) => {
    if (!searchQuery) return jobs;
    const q = searchQuery.toLowerCase();
    return jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      (j.cropFocus || "").toLowerCase().includes(q)
    );
  };

  const displayJobs =
    filter === 'my-jobs' ? filteredJobs(myJobsList) :
      filter === 'saved' ? filteredJobs(savedJobsList) :
        filteredJobs(recommendedJobs);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.company || !newJob.location) return;

    try {
      const jobRef = doc(jobsCollection, crypto.randomUUID());
      const job: Job = {
        id: jobRef.id,
        authorId: currentUser.id,
        title: newJob.title,
        company: newJob.company,
        location: newJob.location,
        description: newJob.description || '',
        type: newJob.type as any,
        salaryRange: newJob.salaryRange,
        postedAt: Date.now(),
        cropFocus: newJob.cropFocus
      };

      await setDoc(jobRef, job);

      // Notify relevant users (those who grow the specific crop)
      if (job.cropFocus) {
        const usersSnapshot = await getDocs(query(usersCollection));
        const relevantUsers: User[] = [];

        usersSnapshot.forEach((doc) => {
          const user = { ...doc.data(), id: doc.id } as User;
          if (user.id !== currentUser.id && user.cropsGrown.includes(job.cropFocus!)) {
            relevantUsers.push(user);
          }
        });

        for (const user of relevantUsers) {
          const notifRef = doc(notificationsCollection, crypto.randomUUID());
          const notif: Notification = {
            id: notifRef.id,
            userId: user.id,
            actorId: currentUser.id,
            type: 'job_alert',
            content: `posted a new ${job.cropFocus} opportunity: ${job.title}`,
            isRead: false,
            timestamp: Date.now(),
            linkId: jobRef.id
          };
          await setDoc(notifRef, notif);
        }
      }

      setShowPostModal(false);
      setNewJob({ type: 'Full-time' });
    } catch (error) {
      console.error('Error posting job:', error);
      alert('Failed to post job. Please try again.');
    }
  };

  const toggleSaveJob = async (jobId: string) => {
    try {
      const existing = savedJobRecords.find(sj => sj.jobId === jobId);

      if (existing) {
        await deleteDoc(doc(savedJobsCollection, existing.id));
      } else {
        const savedJobRef = doc(savedJobsCollection, crypto.randomUUID());
        await setDoc(savedJobRef, {
          id: savedJobRef.id,
          userId: currentUser.id,
          jobId
        });
      }
    } catch (error) {
      console.error('Error saving/unsaving job:', error);
    }
  };

  const isJobSaved = (jobId: string) => savedJobRecords.some(sj => sj.jobId === jobId);

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 mt-6 px-4">
      {/* Sidebar Left */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm sticky top-20">
          <div className="p-4 space-y-1">
            <button
              onClick={() => setFilter('recommended')}
              className={`flex items-center justify-between w-full text-sm font-bold p-3 rounded-lg transition-all ${filter === 'recommended' ? 'bg-agri-green/10 text-agri-green' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-3"><Briefcase className="w-5 h-5" /> Recommended</div>
              <ChevronRight className={`w-4 h-4 transition-transform ${filter === 'recommended' ? 'rotate-90' : ''}`} />
            </button>
            <button
              onClick={() => setFilter('my-jobs')}
              className={`flex items-center justify-between w-full text-sm font-bold p-3 rounded-lg transition-all ${filter === 'my-jobs' ? 'bg-agri-green/10 text-agri-green' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-3"><CheckCircle className="w-5 h-5" /> My Jobs</div>
              <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">{myJobsList.length}</span>
            </button>
            <button
              onClick={() => setFilter('saved')}
              className={`flex items-center justify-between w-full text-sm font-bold p-3 rounded-lg transition-all ${filter === 'saved' ? 'bg-agri-green/10 text-agri-green' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-3"><Bookmark className="w-5 h-5" /> Saved Jobs</div>
              <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">{savedJobsList.length}</span>
            </button>
          </div>
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => setShowPostModal(true)}
              className="w-full bg-agri-green text-white py-2.5 rounded-full font-bold text-sm hover:bg-green-800 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Post a Job
            </button>
          </div>
        </div>
      </div>

      {/* Main Jobs Content */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm min-h-[500px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {filter === 'recommended' ? 'Agricultural Opportunities' :
                  filter === 'my-jobs' ? 'My Listings' : 'Saved for Later'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {filter === 'recommended' ? `Tailored to your crops (${currentUser.cropsGrown.join(', ') || 'Global'}) and location` : 'Manage your farming professional path'}
              </p>
            </div>
            <div className="relative group w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by crop..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-agri-green/20 w-full sm:w-48 transition-all"
              />
            </div>
          </div>

          <div className="space-y-0">
            {displayJobs.length > 0 ? (
              displayJobs.map(job => (
                <div key={job.id} className="flex gap-5 py-6 border-b border-slate-50 last:border-none group hover:bg-slate-50/50 px-2 -mx-2 rounded-xl transition-all">
                  <div className="w-16 h-16 bg-agri-green/5 flex items-center justify-center rounded-xl border border-agri-green/10 flex-shrink-0">
                    <Briefcase className="w-8 h-8 text-agri-green/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-slate-800 group-hover:text-agri-green transition-colors truncate pr-4">{job.title}</h3>
                      <button
                        onClick={() => toggleSaveJob(job.id)}
                        className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${isJobSaved(job.id) ? 'text-agri-green' : 'text-slate-300'}`}
                      >
                        <Bookmark className={`w-5 h-5 ${isJobSaved(job.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-slate-600">{job.company}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5" /> {job.location}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="bg-agri-green/10 text-agri-green text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider">{job.type}</span>
                      {job.salaryRange && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">{job.salaryRange}</span>}
                      {job.cropFocus && <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">{job.cropFocus}</span>}
                    </div>

                    <p className="text-sm text-slate-500 mt-4 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Posted {new Date(job.postedAt).toLocaleDateString()}</span>
                      <button className="text-agri-green font-bold text-sm hover:underline flex items-center gap-1">
                        View Details <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-24 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No matching jobs found</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">Try updating your profile with more crops or location details to see relevant opportunities.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Job Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Post a Farming Opportunity</h3>
              <button onClick={() => setShowPostModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostJob} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Job Title</label>
                  <input
                    required
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none"
                    placeholder="e.g. Senior Agronomist, Harvest Supervisor"
                    value={newJob.title || ''}
                    onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Company / Farm Name</label>
                  <input
                    required
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none"
                    placeholder="e.g. Green Valley Estates"
                    value={newJob.company || ''}
                    onChange={e => setNewJob({ ...newJob, company: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Location</label>
                  <input
                    required
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none"
                    placeholder="e.g. Central Valley, CA"
                    value={newJob.location || ''}
                    onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Job Type</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none"
                    value={newJob.type}
                    onChange={e => setNewJob({ ...newJob, type: e.target.value as any })}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Seasonal">Seasonal</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Salary / Pay Range</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none"
                    placeholder="e.g. $45k - $60k"
                    value={newJob.salaryRange || ''}
                    onChange={e => setNewJob({ ...newJob, salaryRange: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Crop Focus (Optional)</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none"
                    placeholder="e.g. Maize, Organic Berries"
                    value={newJob.cropFocus || ''}
                    onChange={e => setNewJob({ ...newJob, cropFocus: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Description & Requirements</label>
                <textarea
                  required
                  rows={5}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-agri-green/20 outline-none resize-none"
                  placeholder="Describe the role, seasonal tasks, and required experience..."
                  value={newJob.description || ''}
                  onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-[12px] text-blue-700">
                  Your job will be visible to all members of AgriConnect. We recommend adding crop-specific keywords to improve matching with qualified farmers and agronomists.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="flex-1 border border-slate-300 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 bg-agri-green text-white py-3 px-10 rounded-xl font-black shadow-lg hover:bg-green-800 transition-all active:scale-[0.98]"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;