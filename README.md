
# StatusPage - Fullstack Monitoring Application

A modern, full-stack service status page application for tracking uptime, incidents, and maintenance schedules. Features real-time updates, organization multi-tenancy, and a clean admin dashboard.

## Features

- **Multi-Tenant Architecture**: Isolate data and status pages per organization.
- **Real-Time Updates**: Instant status changes on the public page via WebSockets (Socket.io).
- **Incident Management**: track active incidents, post updates, and resolve issues.
- **Maintenance Schedules**: Plan and announce upcoming maintenance windows.
- **Team Management**: Invite members, assign roles (Admin/Member), and manage permissions.
- **Public Status Page**: Dedicated, branded page for your customers (`/status/:slug`).

## Tech Stack

- **Frontend**: React, standard Vite setup, Tailwind CSS, shadcn/ui, React Query, Socket.io Client.
- **Backend**: Node.js, Express, Socket.io, JWT Authentication.
- **Database**: SQLite (Development), Prisma ORM.
- **Language**: TypeScript (Full stack type safety).

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/statuspage.git
    cd statuspage
    ```

2.  **Install dependencies**:
    ```bash
    # Server
    cd server
    npm install

    # Client
    cd ../client
    npm install
    ```

3.  **Environment Setup**:
    - **Server**: Create `server/.env`
      ```env
      DATABASE_URL="file:./dev.db"
      JWT_SECRET="your-secret-key-change-this"
      PORT=3001
      CLIENT_URL="http://localhost:5173"
      ```
    - **Client**: Create `client/.env`
      ```env
      VITE_API_URL="http://localhost:3001/api"
      VITE_SOCKET_URL="http://localhost:3001"
      ```

4.  **Database Setup**:
    ```bash
    cd server
    npx prisma migrate dev --name init
    # Optional: Seed with demo data
    npx tsx prisma/seed.ts
    ```
    *(The seed creates an admin user: `admin@acme.com` / `password123`)*

### Running Locally

1.  **Start the Backend**:
    ```bash
    cd server
    npm run dev
    # Running on http://localhost:3001
    ```

2.  **Start the Frontend**:
    ```bash
    cd client
    npm run dev
    # Running on http://localhost:5173
    ```

3.  **Access the App**:
    - **Dashboard**: [http://localhost:5173/login](http://localhost:5173/login)
    - **Public Status Page**: [http://localhost:5173/status/acme](http://localhost:5173/status/acme) (if seeded)

## Deployment

### Backend (Railway/Render)
1.  Update `schema.prisma` to use `postgresql` provider.
2.  Set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` in your platform's environment variables.
3.  Deploy the `server` directory.

### Frontend (Vercel/Netlify)
1.  Set `VITE_API_URL` and `VITE_SOCKET_URL` to your production backend URL.
2.  Deploy the `client` directory.
# plivo-fullstack
