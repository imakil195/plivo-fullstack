import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PublicStatus, PublicIncidents, Maintenance, ServiceStatus, IncidentStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    XCircle,
    Clock,
    Calendar,
    Activity,
    Zap,
    Wrench,
} from 'lucide-react';
import { format, formatDistanceToNow, formatDistance } from 'date-fns';
import { connectSocket, joinOrgRoom, getSocket } from '@/lib/socket';

const statusConfig: Record<ServiceStatus, { label: string; color: string; bg: string; icon: React.ElementType; dot: string }> = {
    operational: { label: 'Operational', color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: CheckCircle2, dot: 'bg-emerald-500' },
    degraded: { label: 'Degraded Performance', color: 'text-yellow-600', bg: 'bg-yellow-500/10', icon: AlertTriangle, dot: 'bg-yellow-500' },
    partial_outage: { label: 'Partial Outage', color: 'text-orange-600', bg: 'bg-orange-500/10', icon: AlertCircle, dot: 'bg-orange-500' },
    major_outage: { label: 'Major Outage', color: 'text-red-600', bg: 'bg-red-500/10', icon: XCircle, dot: 'bg-red-500' },
};

const incidentStatusConfig: Record<IncidentStatus, { label: string; dotColor: string }> = {
    investigating: { label: 'Investigating', dotColor: 'bg-red-500' },
    identified: { label: 'Identified', dotColor: 'bg-orange-500' },
    monitoring: { label: 'Monitoring', dotColor: 'bg-yellow-500' },
    resolved: { label: 'Resolved', dotColor: 'bg-emerald-500' },
};

const overallBanner: Record<string, { message: string; color: string; bg: string; icon: React.ElementType }> = {
    operational: {
        message: 'All Systems Operational',
        color: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20',
        icon: CheckCircle2,
    },
    degraded: {
        message: 'Some Systems Experiencing Issues',
        color: 'text-yellow-700 dark:text-yellow-400',
        bg: 'bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/20',
        icon: AlertTriangle,
    },
    partial_outage: {
        message: 'Partial System Outage',
        color: 'text-orange-700 dark:text-orange-400',
        bg: 'bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20',
        icon: AlertCircle,
    },
    major_outage: {
        message: 'Major System Outage',
        color: 'text-red-700 dark:text-red-400',
        bg: 'bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-red-500/20',
        icon: XCircle,
    },
};

export default function StatusPage() {
    const { slug } = useParams<{ slug: string }>();
    const queryClient = useQueryClient();

    const { data: statusData, isLoading: statusLoading } = useQuery<PublicStatus>({
        queryKey: ['publicStatus', slug],
        queryFn: async () => (await api.get(`/public/${slug}/status`)).data,
        refetchInterval: 30000,
    });

    const { data: incidentData } = useQuery<PublicIncidents>({
        queryKey: ['publicIncidents', slug],
        queryFn: async () => (await api.get(`/public/${slug}/incidents`)).data,
        refetchInterval: 30000,
    });

    const { data: maintenanceData } = useQuery<Maintenance[]>({
        queryKey: ['publicMaintenance', slug],
        queryFn: async () => (await api.get(`/public/${slug}/maintenance`)).data,
        refetchInterval: 30000,
    });

    // Socket.io real-time updates
    useEffect(() => {
        if (!slug) return;

        const socket = connectSocket();

        socket.on('connect', () => {
            joinOrgRoom(undefined, slug);
        });

        // If already connected, join immediately
        if (socket.connected) {
            joinOrgRoom(undefined, slug);
        }

        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: ['publicStatus', slug] });
            queryClient.invalidateQueries({ queryKey: ['publicIncidents', slug] });
            queryClient.invalidateQueries({ queryKey: ['publicMaintenance', slug] });
        };

        socket.on('service:updated', invalidate);
        socket.on('service:status_changed', invalidate);
        socket.on('service:created', invalidate);
        socket.on('service:deleted', invalidate);
        socket.on('incident:created', invalidate);
        socket.on('incident:updated', invalidate);
        socket.on('incident:resolved', invalidate);
        socket.on('maintenance:created', invalidate);
        socket.on('maintenance:updated', invalidate);

        return () => {
            socket.off('service:updated', invalidate);
            socket.off('service:status_changed', invalidate);
            socket.off('service:created', invalidate);
            socket.off('service:deleted', invalidate);
            socket.off('incident:created', invalidate);
            socket.off('incident:updated', invalidate);
            socket.off('incident:resolved', invalidate);
            socket.off('maintenance:created', invalidate);
            socket.off('maintenance:updated', invalidate);
        };
    }, [slug, queryClient]);

    if (statusLoading || !statusData) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-3xl px-4 py-12">
                    <div className="animate-pulse space-y-4">
                        <div className="h-10 w-48 bg-muted rounded" />
                        <div className="h-20 bg-muted rounded-xl" />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const banner = overallBanner[statusData.overallStatus] || overallBanner.operational;
    const BannerIcon = banner.icon;

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-3xl px-4 py-12">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow">
                        <Zap className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">{statusData.organization.name}</h1>
                </div>

                {/* Overall status banner */}
                <Card className={`mb-8 border ${banner.bg}`}>
                    <CardContent className="flex items-center gap-4 py-5">
                        <BannerIcon className={`h-7 w-7 ${banner.color}`} />
                        <span className={`text-lg font-semibold ${banner.color}`}>{banner.message}</span>
                    </CardContent>
                </Card>

                {/* Active incidents */}
                {incidentData && incidentData.active.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Active Incidents
                        </h2>
                        <div className="space-y-4">
                            {incidentData.active.map((incident) => (
                                <Card key={incident.id} className="border-orange-500/20">
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold">{incident.title}</h3>
                                            <Badge
                                                variant="outline"
                                                className={`${incident.status === 'investigating' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                    incident.status === 'identified' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                                                        'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                                    }`}
                                            >
                                                {incidentStatusConfig[incident.status]?.label || incident.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Affecting <span className="font-medium text-foreground">{incident.service.name}</span>
                                            {' · '}
                                            {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                                        </p>
                                        {/* Latest updates */}
                                        {incident.updates.length > 0 && (
                                            <div className="border-t pt-3 mt-3 space-y-3">
                                                {incident.updates.slice(0, 3).map((u) => {
                                                    const uConf = incidentStatusConfig[u.status as IncidentStatus];
                                                    return (
                                                        <div key={u.id} className="flex gap-3">
                                                            <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${uConf?.dotColor || 'bg-gray-400'}`} />
                                                            <div>
                                                                <p className="text-sm">{u.message}</p>
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                    {format(new Date(u.createdAt), 'MMM d, HH:mm')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Scheduled maintenance */}
                {maintenanceData && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-blue-500" />
                            Scheduled Maintenance
                        </h2>
                        {maintenanceData.length > 0 ? (
                            <div className="space-y-3">
                                {maintenanceData.map((m) => {
                                    const start = new Date(m.scheduledStart);
                                    const end = new Date(m.scheduledEnd);
                                    return (
                                        <Card key={m.id} className="border-blue-500/20">
                                            <CardContent className="py-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className="font-semibold">{m.title}</h3>
                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                                        {m.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {m.service.name} · {format(start, 'EEEE, MMM d • h:mm a')} - {format(end, 'h:mm a')}
                                                    <span className="opacity-75 ml-1">
                                                        ({formatDistance(end, start)})
                                                    </span>
                                                </p>
                                                {m.description && <p className="text-sm mt-2">{m.description}</p>}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                No scheduled maintenance
                            </div>
                        )}
                    </div>
                )}

                {/* Services grid */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Services
                    </h2>
                    <Card>
                        <CardContent className="py-0 divide-y divide-border">
                            {statusData.services.map((service) => {
                                const config = statusConfig[service.status];
                                const Icon = config.icon;
                                // Find active maintenance for this service
                                const activeMaintenance = maintenanceData?.find(
                                    m => m.serviceId === service.id && m.status !== 'completed'
                                );

                                return (
                                    <div key={service.id} className="flex items-center justify-between py-4">
                                        <div>
                                            <h3 className="font-medium">{service.name}</h3>
                                            {service.description && (
                                                <p className="text-sm text-muted-foreground">{service.description}</p>
                                            )}
                                            {activeMaintenance && (
                                                <div className="text-xs text-blue-600 mt-1 flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded w-fit dark:bg-blue-900/30 dark:text-blue-400">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>
                                                        {activeMaintenance.status === 'in_progress' ? 'Maintenance in progress' :
                                                            `Scheduled maintenance: ${format(new Date(activeMaintenance.scheduledStart), 'MMM d, h:mm a')}`
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-2 ${config.color}`}>
                                            <span className="text-sm font-medium hidden sm:inline">{config.label}</span>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                    </div>
                                );
                            })}
                            {statusData.services.length === 0 && (
                                <div className="py-8 text-center text-muted-foreground">
                                    No services configured yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent incident history */}
                {incidentData && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Past Incidents
                        </h2>
                        {incidentData.recent.length > 0 ? (
                            <div className="space-y-4">
                                {incidentData.recent.map((incident) => (
                                    <Card key={incident.id}>
                                        <CardContent className="py-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-semibold">{incident.title}</h3>
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                                    Resolved
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {incident.service.name} · Resolved {incident.resolvedAt && formatDistanceToNow(new Date(incident.resolvedAt), { addSuffix: true })}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                No recent incidents
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <Separator className="my-8" />
                <div className="text-center text-sm text-muted-foreground">
                    <p>Powered by <span className="font-medium text-foreground">StatusPage</span></p>
                </div>
            </div>
        </div>
    );
}
