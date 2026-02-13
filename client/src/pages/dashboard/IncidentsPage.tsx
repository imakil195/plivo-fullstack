import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import type { Incident, Service, IncidentStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Clock, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const incidentStatusConfig: Record<IncidentStatus, { label: string; color: string }> = {
    investigating: { label: 'Investigating', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    identified: { label: 'Identified', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    monitoring: { label: 'Monitoring', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    resolved: { label: 'Resolved', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
};

export default function IncidentsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [serviceId, setServiceId] = useState('');

    const { data: incidents = [], isLoading } = useQuery<Incident[]>({
        queryKey: ['incidents'],
        queryFn: async () => (await api.get('/incidents')).data,
    });

    const { data: services = [] } = useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: async () => (await api.get('/services')).data,
    });

    const createMutation = useMutation({
        mutationFn: (data: { title: string; description: string; serviceId: string }) =>
            api.post('/incidents', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            setCreateOpen(false);
            setTitle('');
            setDescription('');
            setServiceId('');
            toast.success('Incident created');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create incident'),
    });

    const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
    const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');

    const renderIncident = (incident: Incident) => {
        const statusConf = incidentStatusConfig[incident.status];
        return (
            <Card
                key={incident.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/dashboard/incidents/${incident.id}`)}
            >
                <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold truncate">{incident.title}</h3>
                                <Badge variant="outline" className={`${statusConf.color} text-xs`}>
                                    {statusConf.label}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {incident.service.name}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                                </span>
                                {incident.updates.length > 0 && (
                                    <span>{incident.updates.length} update{incident.updates.length !== 1 ? 's' : ''}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
                    <p className="text-muted-foreground mt-1">Track and manage service incidents.</p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Incident
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Incident</DialogTitle>
                            <DialogDescription>Report a new incident for a service.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Affected Service</Label>
                                <Select value={serviceId} onValueChange={setServiceId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a service" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {services.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="incTitle">Title</Label>
                                <Input
                                    id="incTitle"
                                    placeholder="e.g., API Latency Issues"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="incDesc">Description</Label>
                                <Textarea
                                    id="incDesc"
                                    placeholder="Describe the incident..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => createMutation.mutate({ title, description, serviceId })}
                                disabled={!title.trim() || !serviceId || createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create Incident'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="active">
                <TabsList>
                    <TabsTrigger value="active" className="gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Active ({activeIncidents.length})
                    </TabsTrigger>
                    <TabsTrigger value="resolved" className="gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolved ({resolvedIncidents.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="mt-4 space-y-3">
                    {isLoading ? (
                        [1, 2].map((i) => (
                            <Card key={i} className="animate-pulse">
                                <CardContent className="py-5"><div className="h-5 w-60 bg-muted rounded" /></CardContent>
                            </Card>
                        ))
                    ) : activeIncidents.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
                                <h3 className="mt-3 font-semibold">No active incidents</h3>
                                <p className="text-muted-foreground text-sm mt-1">All systems are operating normally.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        activeIncidents.map(renderIncident)
                    )}
                </TabsContent>
                <TabsContent value="resolved" className="mt-4 space-y-3">
                    {resolvedIncidents.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground text-sm">No resolved incidents yet.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        resolvedIncidents.map(renderIncident)
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
