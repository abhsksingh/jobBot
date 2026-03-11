# Deploying to Render

Deploying this Node.js app to [Render](https://render.com) is very simple.

### Step 1: Create a Web Service
1. Sign up/Log in to Render and click **New +** -> **Web Service**.
2. Connect your GitHub account and select the `abhsksingh/jobBot` repository.

### Step 2: Configure the Service
Fill out the configuration page with these values:
- **Name**: `job-bot` (or any name you like)
- **Environment**: `Node`
- **Region**: (choose the one closest to you)
- **Branch**: `main`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 3: Choose your Instance Type
- Select the **Free** instance type to start.

### Step 4: Deploy
- Click **Create Web Service**. Render will now build and deploy your app. You can monitor the logs in the dashboard. Once it's live, Render will give you a public URL (e.g., `https://job-bot-xyz.onrender.com`).

---

### ⚠️ IMPORTANT: SQLite on Render Free Tier
Render's free tier uses **ephemeral memory**. This means every time your service goes to sleep (after 15 mins of inactivity) or restarts, the local file system is wiped.

**What does this mean for JobBot?**
Since JobBot uses a local SQLite database (`db/jobbot.db`), any new applications you track or preferences you save will be **lost** when the server restarts. It will reset back to the 30 seed jobs.

**How to fix this for a production app:**
1. **Render Disks (Paid)**: Upgrade to the $7/mo Starter plan and attach a persistent Disk to store your `data/jobbot.db` file permanently.
2. **Switch to PostgreSQL**: Change the database layer from `better-sqlite3` to PostgreSQL (Render offers a free PostgreSQL database tier).
