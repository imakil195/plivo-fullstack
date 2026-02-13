import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Incident, IncidentStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const incidentStatusConfig: Record<IncidentStatus, { label: string; color: string; dotColor: string }> = {
    investigating: { label: 'Investigating', color: 'bg-red-500/10 text-red-600 border-red-500/20', dotColor: 'bg-red-500' },
    identified: { label: 'Identified', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', dotColor: 'bg-orange-500' },
    monitoring: { label: 'Monitoring', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', dotColor: 'bg-yellow-500' },
    resolved: { label: 'Resolved', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dotColor: 'bg-emerald-500' },
};

export default function IncidentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [updateMessage, setUpdateMessage] = useState('');
    const [updateStatus, setUpdateStatus] = useState<string>('');

    const { data: incident, isLoading } = useQuery<Incident>({
        queryKey: ['incident', id],
        queryFn: async () => (await api.get(`/incidents/${id}`)).data,
        enabled: !!id,
    });

    const addUpdateMutation = useMutation({
        mutationFn: (data: { message: string; status?: string }) =>
            api.post(`/incidents/${id}/updates`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incident', id] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            setUpdateMessage('');
            setUpdateStatus('');
            toast.success('Update added');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to add update'),
    });

    const resolveMutation = useMutation({
        mutationFn: (message?: string) => api.patch(`/incidents/${id}/resolve`, { message }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incident', id] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            toast.success('Incident resolved');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to resolve'),
    });

    if (isLoading || !incident) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-8 w-64 bg-muted rounded" />
                <div className="h-40 bg-muted rounded" />
            </div>
        );
    }

    const statusConf = incidentStatusConfig[incident.status];

    return (
        <div>
            {/* Header */}
            <button
                onClick={() => navigate('/dashboard/incidents')}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Incidents
            </button>

            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
                        <Badge variant="outline" className={statusConf.color}>
                            {statusConf.label}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>Affecting {incident.service.name}</span>
                        <span>•</span>
                        <span>Created {format(new Date(incident.createdAt), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                </div>
                {incident.status !== 'resolved' && (
                    <Button
                        variant="outline"
                        className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                        onClick={() => resolveMutation.mutate('This incident has been resolved.')}
                        disabled={resolveMutation.isPending}
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Resolve Incident
                    </Button>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Timeline */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {incident.updates.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No updates yet.</p>
                            ) : (
                                <div className="relative space-y-0">
                                    {incident.updates.map((update, i) => {
                                        const uConf = incidentStatusConfig[update.status as IncidentStatus] || incidentStatusConfig.investigating;
                                        return (
                                            <div key={update.id} className="relative flex gap-4 pb-8 last:pb-0">
                                                {/* Timeline line */}
                                                {i < incident.updates.length - 1 && (
                                                    <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                                                )}
                                                {/* Dot */}
                                                <div className={`relative z-10 mt-1.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-background ${uConf.dotColor}`} />
                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className={`${uConf.color} text-xs`}>
                                                            {uConf.label}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(update.createdAt), 'MMM d, HH:mm')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm">{update.message}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Add Update form */}
                {incident.status !== 'resolved' && (
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Post Update
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={updateStatus} onValueChange={setUpdateStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="No status change" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="investigating">Investigating</SelectItem>
                                            <SelectItem value="identified">Identified</SelectItem>
                                            <SelectItem value="monitoring">Monitoring</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Message</Label>
                                    <Textarea
                                        placeholder="What's the latest on this incident?"
                                        value={updateMessage}
                                        onChange={(e) => setUpdateMessage(e.target.value)}
                                        rows={4}
                                    />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() =>
                                        addUpdateMutation.mutate({
                                            message: updateMessage,
                                            ...(updateStatus && { status: updateStatus }),
                                        })
                                    }
                                    disabled={!updateMessage.trim() || addUpdateMutation.isPending}
                                >
                                    {addUpdateMutation.isPending ? 'Posting...' : 'Post Update'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
