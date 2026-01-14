import React, { useState } from 'react';
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, usersCollection, doc, setDoc, getDoc } from '../db/firebase';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login existing user
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Get user profile from Firestore
        const userDocRef = doc(usersCollection, uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          onLogin({ ...userData, id: uid });
        } else {
          setError('User profile not found. Please contact support.');
        }
      } else {
        // Register new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        const newUser: User = {
          id: uid,
          name,
          email,
          farmName,
          location: 'Not specified',
          cropsGrown: [],
          experience: 0,
          certifications: [],
          headline: `${farmName} Farmer`,
          bio: '',
          isExpert: false,
          profilePhoto: `https://picsum.photos/seed/${email}/200/200`
        };

        // Save user profile to Firestore
        const userDocRef = doc(usersCollection, uid);
        await setDoc(userDocRef, newUser);

        onLogin(newUser);
      }
    } catch (err: any) {
      console.error('Auth error:', err);

      // User-friendly error messages
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Please check your email and password.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="bg-agri-green text-white px-3 py-1 rounded font-black text-3xl">Ag</div>
        <span className="text-2xl font-bold text-agri-green">AgriConnect</span>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200">
        <h2 className="text-2xl font-bold mb-2 text-center">{isLogin ? 'Sign in' : 'Join AgriConnect'}</h2>
        <p className="text-slate-500 text-sm text-center mb-6">Stay updated on your professional agricultural world</p>

        {error && <p className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4 border border-red-200">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded px-4 py-2 focus:ring-1 focus:ring-agri-green outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Farm / Organization Name</label>
                <input
                  required
                  type="text"
                  value={farmName}
                  onChange={e => setFarmName(e.target.value)}
                  className="w-full border border-slate-300 rounded px-4 py-2 focus:ring-1 focus:ring-agri-green outline-none"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded px-4 py-2 focus:ring-1 focus:ring-agri-green outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded px-4 py-2 focus:ring-1 focus:ring-agri-green outline-none"
              minLength={6}
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-agri-green text-white font-bold py-3 rounded-full hover:bg-green-800 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign in' : 'Agree & Join')}
          </button>
        </form>

        <div className="relative my-8">
          <hr className="border-slate-300" />
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-3 text-sm text-slate-500">or</span>
        </div>

        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="w-full border border-slate-500 text-slate-600 font-bold py-2 rounded-full hover:bg-slate-50 transition-colors"
        >
          {isLogin ? 'New to AgriConnect? Join now' : 'Already on AgriConnect? Sign in'}
        </button>
      </div>

      <p className="mt-8 text-xs text-slate-400 max-w-sm text-center">
        AgriConnect is used by over 5 million farmers and professionals across Asia to share knowledge and improve harvests.
      </p>
    </div>
  );
};

export default Auth;
