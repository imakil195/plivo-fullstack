import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Service, ServiceStatus } from '@/types';
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
import { Activity, ChevronDown, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<ServiceStatus, { label: string; color: string; dot: string }> = {
    operational: { label: 'Operational', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
    degraded: { label: 'Degraded', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', dot: 'bg-yellow-500' },
    partial_outage: { label: 'Partial Outage', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', dot: 'bg-orange-500' },
    major_outage: { label: 'Major Outage', color: 'bg-red-500/10 text-red-600 border-red-500/20', dot: 'bg-red-500' },
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
    const config = statusConfig[status] || statusConfig.operational;
    return (
        <Badge variant="outline" className={`${config.color} gap-1.5 font-medium`}>
            <span className={`h-2 w-2 rounded-full ${config.dot}`} />
            {config.label}
        </Badge>
    );
}

export default function ServicesPage() {
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const { data: services = [], isLoading } = useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: async () => (await api.get('/services')).data,
    });

    const createMutation = useMutation({
        mutationFn: (data: { name: string; description: string }) => api.post('/services', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            setCreateOpen(false);
            setNewName('');
            setNewDesc('');
            toast.success('Service created');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create service'),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.patch(`/services/${id}`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            toast.success('Status updated');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to update status'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/services/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            setDeleteId(null);
            toast.success('Service deleted');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete service'),
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Services</h1>
                    <p className="text-muted-foreground mt-1">Manage your monitored services and their statuses.</p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Service
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Service</DialogTitle>
                            <DialogDescription>Add a new service to monitor on your status page.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="serviceName">Service Name</Label>
                                <Input
                                    id="serviceName"
                                    placeholder="e.g., Payment API"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="serviceDesc">Description (optional)</Label>
                                <Textarea
                                    id="serviceDesc"
                                    placeholder="Brief description of the service"
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => createMutation.mutate({ name: newName, description: newDesc })}
                                disabled={!newName.trim() || createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create Service'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="py-5">
                                <div className="h-5 w-40 bg-muted rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : services.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Activity className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">No services yet</h3>
                        <p className="text-muted-foreground mt-1">Add your first service to start monitoring.</p>
                        <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Add Service
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {services.map((service) => (
                        <Card key={service.id} className="group hover:shadow-md transition-shadow">
                            <CardContent className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h3 className="font-semibold">{service.name}</h3>
                                        {service.description && (
                                            <p className="text-sm text-muted-foreground mt-0.5">{service.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-1.5">
                                                <StatusBadge status={service.status} />
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {Object.entries(statusConfig).map(([key, config]) => (
                                                <DropdownMenuItem
                                                    key={key}
                                                    onClick={() => updateStatusMutation.mutate({ id: service.id, status: key })}
                                                    className="gap-2"
                                                >
                                                    <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                                                    {config.label}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => setDeleteId(service.id)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Delete confirmation */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Service</DialogTitle>
                        <DialogDescription>
                            This will permanently delete this service and all its incidents. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
