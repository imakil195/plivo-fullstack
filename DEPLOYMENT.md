# Deployment Guide: Plivo Status

This guide will walk you through deploying your full-stack application. We recommend using **Railway** for the backend/database and **Vercel** for the frontend.

## 1. Database & Backend (Railway)

We recommend [Railway](https://railway.app/) because it provides a managed PostgreSQL database and handles Node.js deployments seamlessly.

### Step 1: Create a PostgreSQL Instance
1. Go to Railway and create a new project.
2. Select **Provision PostgreSQL**.
3. Once created, go to the "Variables" tab of your Postgres service and copy the `DATABASE_URL`.

### Step 2: Deploy the Backend
1. Create a new service in your Railway project and select **GitHub Repo**.
2. Select your `plivo-fullstack` repository.
3. In the service settings, set the **Root Directory** to `server`.
4. Add the following **Environment Variables**:
   - `DATABASE_URL`: (Paste the URL from Step 1)
   - `JWT_SECRET`: (A random string, e.g., `status-secret-123`)
   - `CLIENT_URL`: (You will get this after deploying the frontend)
   - `RESEND_API_KEY`: (Your Resend API key)
   - `PORT`: `4000`

### Step 3: Run Database Migrations
Railway will automatically try to build your app using the `build` script in `server/package.json`. Make sure to run migrations. 
- You can add `npx prisma migrate deploy` to your startup command or build script.

---

## 2. Frontend (Vercel)

[Vercel](https://vercel.com/) is the best place to host your React (Vite) frontend.

### Step 1: Deploy to Vercel
1. Go to Vercel and **Add New Project**.
2. Import your GitHub repository.
3. In the "Project Settings":
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the following **Environment Variables**:
   - `VITE_API_URL`: (The URL of your Railway backend, e.g., `https://your-backend.up.railway.app/api`)
   - `VITE_SOCKET_URL`: (The same Railway URL, but without `/api`)

### Step 2: Final Connection
1. Once Vercel provides your frontend URL (e.g., `https://plivo-status.vercel.app`), go back to your **Railway Backend** settings.
2. Update the `CLIENT_URL` variable with this new Vercel URL.
3. Restart the Railway service.

---

## Deployment Summary (Cheat Sheet)

| Component | Provider | Key Config |
| :--- | :--- | :--- |
| **Frontend** | Vercel | Root: `client`, Env: `VITE_API_URL` |
| **Backend** | Railway | Root: `server`, Env: `DATABASE_URL`, `JWT_SECRET` |
| **Database** | Railway | Managed PostgreSQL |

---

## ⚠️ Important Note on Socket.io
Since this app uses Socket.io, ensure your backend hosting (Railway) supports persistent connections (WebSockets). Railway supports this by default. 
