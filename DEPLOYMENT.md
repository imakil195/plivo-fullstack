# 🚂 Complete Railway Deployment Guide (All-in-One)

This guide shows you how to deploy the **Database**, **Backend**, and **Frontend** all on [Railway.app](https://railway.app/). This is the best way to keep everything in one place with real-time updates working.

---

## Step 1: Create the Project & Database
1. Go to your Railway Dashboard and click **"New Project"**.
2. Select **"Provision PostgreSQL"**.
3. Click on the **PostgreSQL** service -> **Variables** tab -> Copy the `DATABASE_URL`.

---

## Step 2: Deploy the Backend
1. In the same project, click **"New"** -> **"GitHub Repo"** -> Select `plivo-fullstack`.
2. Go to this new service's **Settings**:
    - **Service Name**: `Service-Backend`
    - **Root Directory**: `server`
    - **Build Command**: `npx prisma generate && npm run build`
    - **Start Command**: `npm start`
3. Go to the **Variables** tab and add:
    - `DATABASE_URL`: (Paste the link from Step 1)
    - `JWT_SECRET`: `Status-Akil-99` (Any random string)
    - `RESEND_API_KEY`: (From your Resend dashboard)
    - `CLIENT_URL`: `https://placeholder.com` (We will fix this in Step 4)
    - `PORT`: `3001`
4. Under **Settings** -> **Public Networking**, click **"Generate Domain"**. **Copy this URL** (e.g., `https://plivo-backend.up.railway.app`).

---

## Step 3: Deploy the Frontend
1. In the same project, click **"New"** -> **"GitHub Repo"** again -> Select `plivo-fullstack`.
2. Go to this new service's **Settings**:
    - **Service Name**: `Service-Frontend`
    - **Root Directory**: `client`
    - **Build Command**: `npm run build`
    - **Start Command**: `npx serve -s dist -l 5173` (This serves your React app)
3. Go to the **Variables** tab and add:
    - `VITE_API_URL`: `https://your-backend-url.up.railway.app/api` (End with `/api`)
    - `VITE_SOCKET_URL`: `https://your-backend-url.up.railway.app` (No `/api`)
4. Under **Settings** -> **Public Networking**, click **"Generate Domain"**. **Copy this URL** (e.g., `https://plivo-status.up.railway.app`).

---

## Step 4: Final Handshake (Crucial)
1. Go back to your **Backend Service** variables.
2. Edit `CLIENT_URL` and replace the placeholder with your **Frontend Domain** from Step 3.
3. Railway will restart your backend.

**✅ YOU ARE LIVE!** Your app, database, and real-time updates are now running on a single platform.

---

### ❓ Troubleshooting
- **"Whitescreen on Frontend"**: Ensure you have `npx serve -s dist -l 5173` as the start command in your Frontend settings.
- **"Invites not working"**: Double check that `RESEND_API_KEY` is correct in the Backend variables.
- **"Database Tables Missing"**: Open the Railway Terminal for the Backend and run `npx prisma migrate deploy`.
