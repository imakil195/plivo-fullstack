#  - Learn.md

 This file provides a comprehensive overview of the entire codebase, the technical stack, the system architecture, and how the different components interact.

---

## 🚀 1. Tech Stack

### Frontend (Client)
- **Core**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/) for high-performance development.
- **Routing**: [React Router 7](https://reactrouter.com/) for page navigation.
- **State Management**: [TanStack Query (React Query) v5](https://tanstack.com/query/latest) for server state and caching.
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with [Shadcn/UI](https://ui.shadcn.com/) for a premium, accessible component library.
- **Real-time**: [Socket.io-client](https://socket.io/) for live status updates.
- **Communication**: [Axios](https://axios-http.com/) for API requests.

### Backend (Server)
- **Runtime**: [Node.js](https://nodejs.org/) with [TypeScript](https://www.typescriptlang.org/).
- **Framework**: [Express](https://expressjs.com/) for the REST API.
- **Database**: [PostgreSQL](https://www.postgresql.org/) managed via [Prisma ORM](https://www.prisma.io/).
- **Real-time**: [Socket.io](https://socket.io/) for broadcasting status changes.
- **Auth**: [JSON Web Tokens (JWT)](https://jwt.io/) and [Bcryptjs](https://github.com/dcodeIO/bcrypt.js/) for secure sessions.
- **Email**: [Resend](https://resend.com/) for sending team invitations.

---

## 🏗️ 2. Project Architecture & Flow

The application follows a classic **Client-Server** architecture with specialized layers for data persistence and real-time communication.

### The E2E Flow:
1.  **Onboarding**: A user signs up and creates an **Organization**. The system automatically generates a "clean" slug (e.g., "Apple" becomes `apple`).
2.  **Management**: Admins log in to the **Dashboard** to:
    - Add/Edit **Services** (e.g., "Main API", "Payment Gateway").
    - Create **Incidents** when things break, providing status updates (Investigating, Identified, Monitoring, Resolved).
    - Schedule **Maintenance** windows.
3.  **Real-time Updates**:
    - When a service status changes, the server broadcasts an event via **Socket.io**.
    - All active users (internal dashboard and public status page) receive the update instantly without refreshing.
4.  **Public Visibility**:
    - Every organization has a public status page at `/status/:slug`.
    - Customers can view the operational status and incident history here.
5.  **Team Collaboration**:
    - Admins invite users via email (**Resend**).
    - Invited users accept the link and are added to the team (sharing access to the organization's dashboard).

---

## 📁 3. Folder Structure Breakdown

### `/client` (The Frontend)
- **`src/pages/`**: The core views of the app.
    - `auth/`: Login, Signup, and Invitation Acceptance pages.
    - `dashboard/`: The private admin management area (Service list, Incident management, Team settings).
    - `public/`: The status page that end-users see.
- **`src/components/`**:
    - `ui/`: Reusable primitive components from Shadcn (Buttons, Inputs, Cards).
    - `layout/`: Global structures like `DashboardLayout` and `Sidebar`.
- **`src/lib/`**: Contains `api.ts`, which sets up the **Axios** instance with interceptors for JWT tokens.
- **`src/context/`**: Contains `AuthContext.tsx` to manage user login state across the entire app.

### `/server` (The Backend)
- **`src/routes/`**: Defines the API endpoints.
    - `auth.ts`: Registration, login, and invite verification.
    - `services.ts`: CRUD for monitored services.
    - `incidents.ts`: Management of incidents and timeline updates.
    - `teams.ts`: Member management and invitation logic.
    - `public.ts`: Read-only endpoints for the public status page.
- **`src/lib/`**:
    - `prisma.ts`: Initializes the Prisma client for database access.
    - `email.ts`: Handles communication with the **Resend** API.
- **`src/socket/`**: Logic for handling socket connections and joining organization-specific "rooms" for targeted broadcasts.
- **`prisma/`**: Contains `schema.prisma`, the "source of truth" for the database structure.
- **`scripts/`**: A collection of maintenance tools for fixing slugs, resetting passwords, and testing email delivery.

---

## 🔑 4. Important Sections of Code

### Real-time Broadcasting (`server/src/routes/services.ts`)
Whenever a service is updated, the server finds the Socket.io instance and emits a `serviceUpdate` event to everyone in that organization's room.
```typescript
const io = req.app.get('io');
io.to(`org:${service.organizationId}`).emit('serviceUpdate', updatedService);
```

### Dynamic Slug Generation (`server/src/routes/auth.ts`)
To ensure clean and unique URLs, the server implements logic that handles collisions by appending counters if necessary.
```typescript
let slug = slugify(name);
// Logic checks DB and appends -1, -2 if 'slug' is already taken.
```

### Role-Based Protection (`server/src/middleware/auth.ts`)
Custom middleware ensures that only authorized members can edit data.
```typescript
export const requireRole = (role: 'admin' | 'member') => { ... };
```

---

## 📊 5. Database Schema Details

- **Organization**: The top-level container.
- **User**: Individual identities.
- **Team**: Connects Organizations to Users through a **TeamMember** join table (storing roles).
- **Service**: Monitored units that have a status (Operational, etc.).
- **Incident**: Tied to a service, contains a history of **IncidentUpdates**.
- **Invite**: Temporary tokens for adding new members.

---

*This document serves as the primary educational resource for developers working on the Plivo Status project.*
