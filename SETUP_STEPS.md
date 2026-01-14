# 🚀 Quick Setup Guide

## ✅ What's Done
- ✅ Firebase credentials configured in `.env.local`
- ✅ Dependencies installed
- ✅ Security rules created (`firestore.rules`)
- ✅ Indexes created (`firestore.indexes.json`)

## 📋 What You Need to Do (5 minutes)

### Step 1: Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/project/agriconnect-350c0/authentication)
2. Click **"Get Started"** (if you see it)
3. Click **"Email/Password"** under Sign-in providers
4. **Toggle to ENABLE** ✅
5. Click **"Save"**

### Step 2: Deploy Security Rules (After Firebase CLI installs)

The Firebase CLI is currently installing. Once complete, run:

```bash
# Login to Firebase
firebase login

# Initialize Firebase (one-time setup)
firebase init

# When prompted, select:
# - Firestore (use spacebar to select)
# - Use existing project: agriconnect-350c0
# - Accept default filenames

# Deploy security rules and indexes
firebase deploy --only firestore
```

### Step 3: Run Your App!

```bash
npm run dev
```

Visit `http://localhost:3000` and create your first account!

---

## 🎯 Test Real-Time Features

1. Open app in **Browser 1** → Sign up as User A
2. Open app in **Browser 2** (incognito) → Sign up as User B  
3. **User A**: Create a post
4. **User B**: See it appear instantly! 🎉

---

## 📌 Important URLs

- **Firebase Console**: https://console.firebase.google.com/project/agriconnect-350c0
- **Authentication**: https://console.firebase.google.com/project/agriconnect-350c0/authentication
- **Firestore Database**: https://console.firebase.google.com/project/agriconnect-350c0/firestore

---

## 🔒 Security Note

⚠️ **Your `.env.local` file contains sensitive credentials!**
- ✅ Already protected by `.gitignore`
- ❌ NEVER commit this file to Git
- ❌ NEVER share these credentials publicly

When deploying to Vercel, add these as environment variables in the dashboard.
