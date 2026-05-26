# 🚀 Quick Deploy Guide (10 Minutes)

## Step 1: Setup MongoDB Atlas (3 minutes)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with Google (fastest)
3. Choose **FREE** tier (M0)
4. Click "Create Cluster"
5. Wait 1-3 minutes for cluster creation
6. Click "Connect" → "Connect your application"
7. Copy connection string:
   ```
   mongodb+srv://username:<password>@cluster.mongodb.net/medsecure
   ```
8. Replace `<password>` with your actual password
9. Click "Network Access" → "Add IP Address" → "Allow Access from Anywhere" (`0.0.0.0/0`)

**Save this connection string - you'll need it!**

---

## Step 2: Push to GitHub (2 minutes)

```bash
# Open PowerShell in your project folder
cd "c:\Users\ay094\OneDrive\Desktop\MedSecure Project\MedSecure"

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial deployment"

# Go to github.com and create a new repository named "medsecure"
# Then run (replace YOUR_USERNAME with your GitHub username):
git remote add origin https://github.com/YOUR_USERNAME/medsecure.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy on Render (5 minutes)

### A. Deploy Backend

1. Go to https://render.com
2. Click "Get Started" → Sign up with GitHub
3. Click "New +" → "Web Service"
4. Select your "medsecure" repository
5. Fill in:
   - **Name:** `medsecure-api`
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && npm start`
6. Click "Advanced" → Add Environment Variables:
   ```
   NODE_ENV = production
   PORT = 5001
   MONGODB_URI = (paste your MongoDB connection string)
   JWT_SECRET = medsecure-secret-key-2024
   EMAIL_USER = (your Gmail address)
   EMAIL_PASS = (your Gmail app password)
   ```
7. Click "Create Web Service"
8. **Wait 5-10 minutes** for deployment
9. **Copy your backend URL:** `https://medsecure-api-XXXX.onrender.com`

### B. Deploy Frontend

1. Click "New +" → "Static Site"
2. Select your "medsecure" repository again
3. Fill in:
   - **Name:** `medsecure-client`
   - **Build Command:** `cd client && npm install && npm run build`
   - **Publish Directory:** `client/build`
4. Click "Advanced" → Add Environment Variable:
   ```
   REACT_APP_API_URL = https://medsecure-api-XXXX.onrender.com/api
   ```
   (Use the backend URL you copied above)
5. Click "Create Static Site"
6. **Wait 5-10 minutes** for deployment
7. **Your app is live!** 🎉

---

## Step 4: Update CORS (1 minute)

1. Open `server/src/index.js` in your code editor
2. Find the `cors` section (around line 30)
3. Add your frontend URL:
   ```javascript
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'https://medsecure-client-XXXX.onrender.com', // Add this line
     ],
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```
4. Save and push to GitHub:
   ```bash
   git add .
   git commit -m "Update CORS for production"
   git push
   ```
5. Render will auto-deploy the update (2-3 minutes)

---

## ✅ Test Your Deployment

1. Visit your frontend URL: `https://medsecure-client-XXXX.onrender.com`
2. Try to register a new user
3. Check your email for OTP
4. Login and test features

---

## 🎯 Your Live URLs

**Frontend:** `https://medsecure-client-XXXX.onrender.com`
**Backend:** `https://medsecure-api-XXXX.onrender.com`
**Health Check:** `https://medsecure-api-XXXX.onrender.com/api/health`

---

## 🆘 Common Issues

### "Application Error" on frontend
- Wait 2-3 minutes, Render is still deploying
- Check Render dashboard for build logs

### "Cannot connect to backend"
- Make sure you updated CORS with your frontend URL
- Check backend is running (visit health check URL)
- Verify `REACT_APP_API_URL` is correct

### "Database connection failed"
- Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Verify connection string is correct
- Make sure you replaced `<password>` with actual password

---

## 💰 Total Cost: $0/month

All services used are 100% FREE:
- ✅ Render.com (Free tier)
- ✅ MongoDB Atlas (Free tier)
- ✅ GitHub (Free)
- ✅ IPFS/Pinata (Free tier)

---

## 🎉 Congratulations!

Your MedSecure app is now live and accessible from anywhere in the world!

Share your URL with others and start using it! 🚀
