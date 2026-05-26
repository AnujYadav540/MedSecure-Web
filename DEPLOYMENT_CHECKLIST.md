# 🚀 MedSecure Deployment Checklist

## ✅ Pre-Deployment Steps

### 1. Code Preparation
- [x] `.gitignore` file created
- [x] `render.yaml` configuration created
- [x] Health check endpoint added (`/api/health`)
- [ ] Update CORS origins for production
- [ ] Test production build locally

### 2. Environment Variables Setup

**Backend Environment Variables:**
```
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medsecure
JWT_SECRET=your-super-secret-jwt-key-change-this
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
```

**Frontend Environment Variables:**
```
REACT_APP_API_URL=https://your-backend-url.onrender.com/api
```

### 3. MongoDB Atlas Setup
- [ ] Create free MongoDB Atlas account
- [ ] Create free cluster (M0 - 512MB)
- [ ] Create database user
- [ ] Whitelist IP: `0.0.0.0/0` (allow all IPs)
- [ ] Get connection string
- [ ] Test connection locally

### 4. GitHub Repository
- [ ] Create GitHub account (if needed)
- [ ] Create new repository named "medsecure"
- [ ] Push code to GitHub

---

## 🎯 Deployment Steps (Render.com)

### Step 1: Sign Up on Render
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub
4. Authorize Render to access your repositories

### Step 2: Deploy Backend API
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `medsecure-api`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Root Directory:** (leave empty)
   - **Environment:** Node
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && npm start`
   - **Plan:** Free
4. Add Environment Variables (click "Advanced"):
   - `NODE_ENV` = `production`
   - `PORT` = `5001`
   - `MONGODB_URI` = (your MongoDB Atlas connection string)
   - `JWT_SECRET` = (generate random string)
   - `EMAIL_USER` = (your Gmail)
   - `EMAIL_PASS` = (your Gmail app password)
5. Click "Create Web Service"
6. Wait for deployment (5-10 minutes)
7. Copy your backend URL: `https://medsecure-api.onrender.com`

### Step 3: Deploy Frontend
1. Click "New +" → "Static Site"
2. Connect same GitHub repository
3. Configure:
   - **Name:** `medsecure-client`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Root Directory:** (leave empty)
   - **Build Command:** `cd client && npm install && npm run build`
   - **Publish Directory:** `client/build`
4. Add Environment Variable:
   - `REACT_APP_API_URL` = `https://medsecure-api.onrender.com/api`
5. Click "Create Static Site"
6. Wait for deployment (5-10 minutes)
7. Copy your frontend URL: `https://medsecure-client.onrender.com`

### Step 4: Update CORS Settings
1. Go to your backend code
2. Update `server/src/index.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://medsecure-client.onrender.com', // Add your frontend URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```
3. Commit and push to GitHub
4. Render will auto-deploy the update

---

## 🧪 Testing Your Deployment

### 1. Test Backend API
Visit: `https://medsecure-api.onrender.com/api/health`

Expected response:
```json
{
  "status": "ok",
  "message": "MedSecure API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Test Frontend
1. Visit: `https://medsecure-client.onrender.com`
2. Should see MedSecure login page
3. Try to register a new user
4. Try to login
5. Upload a medical record
6. Check access logs

### 3. Test Email Notifications
1. Register a new user
2. Check email for verification OTP
3. Grant access to a doctor
4. Doctor views record
5. Patient should receive email notification

---

## 🔧 Post-Deployment Configuration

### 1. Custom Domain (Optional)
- Buy domain from Namecheap/GoDaddy (~$10/year)
- Add custom domain in Render dashboard
- Update DNS records

### 2. Monitoring
- Check Render dashboard for logs
- Monitor MongoDB Atlas usage
- Set up uptime monitoring (UptimeRobot - free)

### 3. Backup Strategy
- MongoDB Atlas automatic backups (included in free tier)
- Export important data regularly
- Keep local development copy

---

## 🆘 Troubleshooting

### Backend won't start
**Check:**
- [ ] Environment variables are set correctly
- [ ] MongoDB connection string is correct
- [ ] MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- [ ] Check logs in Render dashboard

**Fix:**
```bash
# Test MongoDB connection locally
node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_MONGODB_URI').then(() => console.log('Connected!')).catch(err => console.error(err));"
```

### Frontend can't connect to backend
**Check:**
- [ ] `REACT_APP_API_URL` is set correctly
- [ ] Backend CORS includes frontend URL
- [ ] Backend is running (check health endpoint)

**Fix:**
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for failed requests
4. Verify API URL in requests

### Database connection failed
**Check:**
- [ ] MongoDB Atlas cluster is running
- [ ] Database user credentials are correct
- [ ] IP whitelist includes `0.0.0.0/0`
- [ ] Connection string format is correct

**Fix:**
```
mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
```

### Build failed
**Check:**
- [ ] All dependencies are in `package.json`
- [ ] No syntax errors in code
- [ ] Build command is correct

**Fix:**
1. Test build locally: `cd client && npm run build`
2. Check Render build logs
3. Fix errors and push to GitHub

---

## 📊 Free Tier Limitations

### Render.com Free Tier
- ✅ 750 hours/month (enough for 1 service 24/7)
- ✅ 100GB bandwidth/month
- ⚠️ Services spin down after 15 minutes of inactivity
- ⚠️ Takes ~30 seconds to wake up on first request
- ⚠️ No custom domains on free tier

### MongoDB Atlas Free Tier
- ✅ 512MB storage
- ✅ Shared cluster
- ✅ Automatic backups
- ⚠️ Limited to 100 connections
- ⚠️ Shared resources (slower performance)

### Workarounds for Limitations
1. **Spin down issue:** Use UptimeRobot to ping your site every 5 minutes
2. **Storage limit:** Clean up old records regularly
3. **Bandwidth limit:** Optimize images and files

---

## 🎉 Success Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] MongoDB connected
- [ ] User registration works
- [ ] Email notifications work
- [ ] File upload works
- [ ] Access logs work
- [ ] Download works
- [ ] All features tested

---

## 📝 Important URLs

**Your Deployment URLs:**
- Frontend: `https://medsecure-client.onrender.com`
- Backend: `https://medsecure-api.onrender.com`
- Health Check: `https://medsecure-api.onrender.com/api/health`

**Service Dashboards:**
- Render: https://dashboard.render.com
- MongoDB Atlas: https://cloud.mongodb.com
- GitHub: https://github.com/YOUR_USERNAME/medsecure

---

## 🚀 Quick Deploy Commands

```bash
# 1. Navigate to project
cd "c:\Users\ay094\OneDrive\Desktop\MedSecure Project\MedSecure"

# 2. Initialize git (if not already)
git init

# 3. Add all files
git add .

# 4. Commit
git commit -m "Ready for deployment"

# 5. Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/medsecure.git

# 6. Push to GitHub
git push -u origin main
```

Then follow Render deployment steps above!

---

## 💡 Pro Tips

1. **Keep secrets secret:** Never commit `.env` files to GitHub
2. **Use strong passwords:** Generate random JWT_SECRET
3. **Monitor usage:** Check Render and MongoDB dashboards regularly
4. **Test locally first:** Always test changes locally before deploying
5. **Use branches:** Create a `dev` branch for testing
6. **Auto-deploy:** Render auto-deploys when you push to GitHub
7. **Check logs:** Use Render dashboard to view real-time logs
8. **Backup data:** Export MongoDB data regularly

---

Need help? Check the logs or ask for assistance! 🙋‍♂️
