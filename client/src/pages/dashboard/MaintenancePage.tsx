import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Maintenance, Service, MaintenanceStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Clock, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const maintenanceStatusConfig: Record<MaintenanceStatus, { label: string; color: string }> = {
    scheduled: { label: 'Scheduled', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    in_progress: { label: 'In Progress', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
};

export default function MaintenancePage() {
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { data: maintenanceList = [], isLoading } = useQuery<Maintenance[]>({
        queryKey: ['maintenance'],
        queryFn: async () => (await api.get('/maintenance')).data,
    });

    const { data: services = [] } = useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: async () => (await api.get('/services')).data,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/maintenance', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            setCreateOpen(false);
            setTitle('');
            setDescription('');
            setServiceId('');
            setStartDate('');
            setEndDate('');
            toast.success('Maintenance scheduled');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create'),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.patch(`/maintenance/${id}`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Status updated');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/maintenance/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            toast.success('Maintenance deleted');
        },
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
                    <p className="text-muted-foreground mt-1">Schedule and manage maintenance windows.</p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Schedule Maintenance
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Schedule Maintenance</DialogTitle>
                            <DialogDescription>Plan a maintenance window for a service.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Service</Label>
                                <Select value={serviceId} onValueChange={setServiceId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select service" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {services.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    placeholder="e.g., Database Migration"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description (optional)</Label>
                                <Textarea
                                    placeholder="Details about the maintenance..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() =>
                                    createMutation.mutate({
                                        title,
                                        description,
                                        serviceId,
                                        scheduledStart: startDate,
                                        scheduledEnd: endDate,
                                    })
                                }
                                disabled={!title || !serviceId || !startDate || !endDate || createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Scheduling...' : 'Schedule'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="py-5"><div className="h-5 w-48 bg-muted rounded" /></CardContent>
                        </Card>
                    ))}
                </div>
            ) : maintenanceList.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">No maintenance scheduled</h3>
                        <p className="text-muted-foreground mt-1">Schedule maintenance windows for your services.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {maintenanceList.map((m) => {
                        const statusConf = maintenanceStatusConfig[m.status];
                        return (
                            <Card key={m.id} className="group hover:shadow-md transition-shadow">
                                <CardContent className="flex items-center justify-between py-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold">{m.title}</h3>
                                            <Badge variant="outline" className={statusConf.color}>
                                                {statusConf.label}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <span>{m.service.name}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(m.scheduledStart), 'MMM d, HH:mm')} – {format(new Date(m.scheduledEnd), 'MMM d, HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {m.status === 'scheduled' && (
                                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: m.id, status: 'in_progress' })}>
                                                    Start Maintenance
                                                </DropdownMenuItem>
                                            )}
                                            {m.status === 'in_progress' && (
                                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: m.id, status: 'completed' })}>
                                                    Complete Maintenance
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                                onClick={() => deleteMutation.mutate(m.id)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
