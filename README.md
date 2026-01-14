<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AgriConnect-Pro 🌾

A professional social networking and recruitment platform tailored for the agricultural industry, enabling farmers, agricultural experts, and agribusiness professionals to connect, share knowledge, and find opportunities.

## ✨ Features

- **🔐 User Authentication** - Secure email/password authentication with Firebase
- **📱 Social Feed** - Share agricultural updates, images, and insights with your network
- **💬 Real-time Messaging** - Direct messaging between connected users
- **👥 Professional Network** - Connect with farmers and agri-experts
- **💼 Job Board** - Post and discover agricultural job opportunities
- **🔔 Notifications** - Stay updated with likes, comments, and connection requests
- **🎯 Smart Recommendations** - Job matching based on crops and location

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | Frontend framework |
| **TypeScript** | Type-safe development |
| **Vite** | Lightning-fast build tool |
| **Firebase** | Backend & Authentication |
| **Firestore** | Real-time NoSQL database |
| **Lucide React** | Beautiful icon library |

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- Firebase account

### Step 1: Clone & Install Dependencies

```bash
npm install
```

### Step 2: Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Follow the setup wizard

2. **Enable Authentication**
   - Go to Authentication > Sign-in method
   - Enable "Email/Password"

3. **Create Firestore Database**
   - Go to Firestore Database
   - Click "Create database"
   - Start in **production mode**
   - Choose your preferred location

4. **Get Firebase Configuration**
   - Go to Project Settings > General
   - Scroll to "Your apps"
   - Click the web icon (`</>`)
   - Copy your Firebase config

5. **Configure Environment Variables**
   - Copy `.env.example` to `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - Fill in your Firebase credentials in `.env.local`:
     ```env
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

6. **Deploy Security Rules & Indexes**
   
   Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```
   
   Login to Firebase:
   ```bash
   firebase login
   ```
   
   Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select: Firestore
   - Use existing project
   - Accept default file names (firestore.rules and firestore.indexes.json)
   
   Deploy rules and indexes:
   ```bash
   firebase deploy --only firestore
   ```

### Step 3: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚀 Deploy to Vercel

### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Option 2: Using GitHub (Recommended)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/agriconnect-pro.git
   git push -u origin main
   ```

2. Import to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Add environment variables from `.env.local`
   - Deploy!

## 📁 Project Structure

```
agriconnect-pro/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Navbar.tsx
│   │   └── PostCard.tsx
│   ├── pages/             # Main application pages
│   │   ├── Auth.tsx       # Login/Register
│   │   ├── Feed.tsx       # Social feed
│   │   ├── Network.tsx    # Connections
│   │   ├── Messaging.tsx  # Direct messages
│   │   └── Jobs.tsx       # Job board
│   ├── db/                # Database configuration
│   │   └── firebase.ts    # Firebase setup
│   ├── types.ts           # TypeScript types
│   └── App.tsx            # Main app component
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Firestore indexes
└── .env.example           # Environment template
```

## 🔒 Security

All data is protected by Firestore security rules:
- Users can only edit their own profiles
- Messages are only visible to sender and receiver
- Posts and jobs are visible to all authenticated users
- Connections require mutual acceptance

## 🗄️ Database Schema

### Collections

| Collection | Description |
|------------|-------------|
| `users` | User profiles and account information |
| `posts` | Social feed posts with images |
| `comments` | Comments on posts |
| `connections` | Network connections between users |
| `messages` | Private messages |
| `jobs` | Job listings |
| `notifications` | User notifications |
| `likes` | Post likes |
| `savedJobs` | User's saved job listings |

## 🎯 Key Features Explained

### Real-time Updates
All data syncs in real-time across devices using Firebase's `onSnapshot` listeners. When one user posts, all connected users see it instantly.

### Smart Job Matching
Jobs are recommended based on:
- User's location
- Crops they grow
- Keywords in job descriptions

### Offline Support
Firebase provides offline persistence - the app works even without internet, syncing when connection returns.

## 🤝 Contributing

This is a portfolio/demo project. Feel free to fork and customize for your own needs!

## 📄 License

MIT License - feel free to use this project for learning or as a template.

## 🆘 Troubleshooting

### "Permission denied" errors
- Check that you've deployed firestore.rules
- Ensure user is authenticated
- Verify security rules in Firebase Console

### Environment variables not working
- Make sure file is named `.env.local` (not `.env`)
- Restart dev server after changing env variables
- Check that variables start with `VITE_`

### Firebase indexes error
- Deploy indexes: `firebase deploy --only firestore:indexes`
- Or create them manually in Firebase Console

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review [Firebase documentation](https://firebase.google.com/docs)
3. Check [Vite documentation](https://vitejs.dev)

---

Built with ❤️ for the agricultural community 🌱
