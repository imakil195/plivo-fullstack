// Auth types
export interface User {
    id: string;
    name: string;
    email: string;
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
}

export interface AuthResponse {
    token: string;
    user: User;
    organization: Organization;
}

export interface MeResponse {
    user: User;
    organization: Organization;
    role: string;
}

// Service types
export type ServiceStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';

export interface Service {
    id: string;
    name: string;
    description: string | null;
    status: ServiceStatus;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    _count?: { incidents: number };
}

// Incident types
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface IncidentUpdate {
    id: string;
    message: string;
    status: IncidentStatus;
    incidentId: string;
    createdAt: string;
}

export interface Incident {
    id: string;
    title: string;
    description: string | null;
    status: IncidentStatus;
    serviceId: string;
    service: { id: string; name: string; status?: string };
    updates: IncidentUpdate[];
    createdAt: string;
    resolvedAt: string | null;
    _count?: { updates: number };
}

// Maintenance types
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed';

export interface Maintenance {
    id: string;
    title: string;
    description: string | null;
    status: MaintenanceStatus;
    scheduledStart: string;
    scheduledEnd: string;
    serviceId: string;
    service: { id: string; name: string };
    createdAt: string;
}

// Team types
export interface TeamMember {
    id: string;
    role: string;
    userId: string;
    teamId: string;
    user: User;
    team: { id: string; name: string };
}

// Public page types
export interface PublicStatus {
    organization: Organization;
    overallStatus: ServiceStatus;
    services: Array<{
        id: string;
        name: string;
        description: string | null;
        status: ServiceStatus;
        updatedAt: string;
    }>;
}

export interface PublicIncidents {
    active: Incident[];
    recent: Incident[];
}
