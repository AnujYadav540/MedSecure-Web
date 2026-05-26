# Free Deployment Guide for MedSecure

## 🎯 Best Free Deployment Strategy

Your MedSecure project has:
- **Frontend:** React app (client)
- **Backend:** Node.js/Express API (server)
- **Database:** MongoDB
- **File Storage:** IPFS (Pinata)

Here's the **100% FREE** deployment plan:

---

## 📦 Option 1: Render.com (RECOMMENDED - Easiest)

### Why Render?
✅ Free tier available
✅ Automatic deployments from GitHub
✅ Built-in PostgreSQL/MongoDB support
✅ Easy environment variables
✅ HTTPS included
✅ No credit card required

### Step-by-Step Deployment

#### 1. Prepare Your Code

**A. Create `.gitignore` (if not exists)**
```
node_modules/
.env
client/node_modules/
client/build/
server/uploads/
*.log
.DS_Store
```

**B. Update `server/package.json` - Add start script:**
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

**C. Create `render.yaml` in project root:**
```yaml
services:
  # Backend API
  - type: web
    name: medsecure-api
    env: node
    region: oregon
    plan: free
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5001
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: EMAIL_USER
        sync: false
      - key: EMAIL_PASS
        sync: false

  # Frontend React App
  - type: web
    name: medsecure-client
    env: static
    region: oregon
    plan: free
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: ./client/build
    envVars:
      - key: REACT_APP_API_URL
        value: https://medsecure-api.onrender.com/api
```

#### 2. Push to GitHub

```bash
# Initialize git (if not already)
cd "c:\Users\ay094\OneDrive\Desktop\MedSecure Project\MedSecure"
git init
git add .
git commit -m "Initial commit for deployment"

# Create GitHub repo and push
# Go to github.com and create a new repository named "medsecure"
git remote add origin https://github.com/YOUR_USERNAME/medsecure.git
git branch -M main
git push -u origin main
```

#### 3. Deploy on Render

1. Go to https://render.com
2. Sign up with GitHub (free)
3. Click "New +" → "Blueprint"
4. Connect your GitHub repository
5. Render will detect `render.yaml` and create both services
6. Add environment variables in Render dashboard:
   - `MONGODB_URI` (from MongoDB Atlas - see below)
   - `JWT_SECRET` (any random string)
   - `EMAIL_USER` (your Gmail)
   - `EMAIL_PASS` (your Gmail app password)

#### 4. Setup MongoDB Atlas (Free)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free tier - no credit card)
3. Create a free cluster (M0 - 512MB)
4. Create database user
5. Whitelist IP: `0.0.0.0/0` (allow all)
6. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/medsecure`
7. Add to Render environment variables

---

## 📦 Option 2: Vercel + Railway (Alternative)

### Frontend on Vercel (Free)
- Unlimited bandwidth
- Automatic HTTPS
- GitHub integration

### Backend on Railway (Free)
- 500 hours/month free
- Built-in MongoDB
- Easy environment variables

### Deployment Steps

#### 1. Deploy Backend on Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd server
railway init

# Deploy
railway up

# Add environment variables
railway variables set MONGODB_URI=your_mongodb_uri
railway variables set JWT_SECRET=your_secret
railway variables set EMAIL_USER=your_email
railway variables set EMAIL_PASS=your_password

# Get your backend URL
railway domain
```

#### 2. Deploy Frontend on Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd client
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? medsecure-client
# - Directory? ./
# - Override settings? No

# Add environment variable
vercel env add REACT_APP_API_URL
# Enter: https://your-railway-backend.up.railway.app/api

# Deploy to production
vercel --prod
```

---

## 📦 Option 3: Netlify + Render (Alternative)

### Frontend on Netlify
1. Go to https://netlify.com
2. Drag and drop `client/build` folder
3. Or connect GitHub repo

### Backend on Render
(Same as Option 1 above)

---

## 🔧 Pre-Deployment Checklist

### 1. Update CORS Settings

**File: `server/src/index.js`**
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend-url.vercel.app',
    'https://your-frontend-url.netlify.app',
    'https://your-frontend-url.onrender.com'
  ],
  credentials: true
}));
```

### 2. Update API Base URL

**File: `client/src/services/api.js`**
```javascript
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000
});
```

### 3. Create Production Build Script

**File: `package.json` (root)**
```json
{
  "scripts": {
    "build": "cd client && npm install && npm run build",
    "start": "cd server && npm start",
    "heroku-postbuild": "npm run build"
  }
}
```

### 4. Environment Variables Needed

**Backend (.env):**
```
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key-here
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
```

**Frontend (.env):**
```
REACT_APP_API_URL=https://your-backend-url.com/api
```

---

## 🎯 Recommended: Render.com (All-in-One)

**Why I recommend Render:**
1. ✅ **Easiest setup** - One platform for everything
2. ✅ **Free tier** - No credit card required
3. ✅ **Auto-deploy** - Push to GitHub = automatic deployment
4. ✅ **Free SSL** - HTTPS included
5. ✅ **Free database** - PostgreSQL included (or use MongoDB Atlas)
6. ✅ **No sleep** - Unlike Heroku free tier

**Limitations:**
- ⚠️ Free tier has limited bandwidth (100GB/month)
- ⚠️ Services may spin down after inactivity (takes 30s to wake up)

---

## 🚀 Quick Start: Deploy in 10 Minutes

### Step 1: Prepare Code (2 minutes)
```bash
cd "c:\Users\ay094\OneDrive\Desktop\MedSecure Project\MedSecure"

# Create .gitignore
echo node_modules/ > .gitignore
echo .env >> .gitignore
echo client/node_modules/ >> .gitignore
echo client/build/ >> .gitignore
```

### Step 2: Push to GitHub (3 minutes)
```bash
git init
git add .
git commit -m "Ready for deployment"

# Create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/medsecure.git
git push -u origin main
```

### Step 3: Deploy on Render (5 minutes)
1. Go to https://render.com
2. Sign up with GitHub
3. New Web Service → Connect your repo
4. **Backend:**
   - Name: medsecure-api
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Add environment variables
5. **Frontend:**
   - Name: medsecure-client
   - Build Command: `cd client && npm install && npm run build`
   - Publish Directory: `client/build`
   - Add `REACT_APP_API_URL` environment variable

### Step 4: Setup MongoDB Atlas (Free)
1. https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Add to Render environment variables

---

## 📝 Post-Deployment

### Update Your URLs
1. Get your backend URL from Render: `https://medsecure-api.onrender.com`
2. Get your frontend URL from Render: `https://medsecure-client.onrender.com`
3. Update CORS in backend
4. Update API URL in frontend
5. Redeploy

### Test Your Deployment
1. Visit your frontend URL
2. Try to register a new user
3. Try to login
4. Upload a medical record
5. Check access logs

---

## 🆘 Troubleshooting

### Backend won't start
- Check environment variables are set
- Check MongoDB connection string
- Check logs in Render dashboard

### Frontend can't connect to backend
- Check CORS settings
- Check `REACT_APP_API_URL` is correct
- Check backend is running

### Database connection failed
- Check MongoDB Atlas IP whitelist (use `0.0.0.0/0`)
- Check connection string format
- Check database user credentials

---

## 💰 Cost Breakdown

| Service | Free Tier | Limitations |
|---------|-----------|-------------|
| **Render** | ✅ Free | 750 hours/month, 100GB bandwidth |
| **MongoDB Atlas** | ✅ Free | 512MB storage, shared cluster |
| **Vercel** | ✅ Free | 100GB bandwidth, unlimited projects |
| **Railway** | ✅ Free | $5 credit/month (500 hours) |
| **Netlify** | ✅ Free | 100GB bandwidth, 300 build minutes |
| **IPFS (Pinata)** | ✅ Free | 1GB storage, unlimited gateways |

**Total Cost: $0/month** 🎉

---

## 🎓 Next Steps

1. Choose your deployment platform (I recommend Render)
2. Follow the step-by-step guide above
3. Test your deployed application
4. Share your live URL!

Need help with any step? Let me know!
