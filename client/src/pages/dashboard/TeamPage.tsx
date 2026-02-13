import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { TeamMember } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { MoreVertical, Plus, Shield, User, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function TeamPage() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('member');

    const { data: members = [], isLoading } = useQuery<TeamMember[]>({
        queryKey: ['teamMembers'],
        queryFn: async () => (await api.get('/teams/members')).data,
    });

    const inviteMutation = useMutation({
        mutationFn: (data: { email: string; name: string; password: string; role: string }) =>
            api.post('/teams/invite', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
            setInviteOpen(false);
            setEmail('');
            setName('');
            setPassword('');
            setRole('member');
            toast.success('Member added');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to add member'),
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ id, role }: { id: string; role: string }) =>
            api.patch(`/teams/members/${id}/role`, { role }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
            toast.success('Role updated');
        },
    });

    const removeMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/teams/members/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
            toast.success('Member removed');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to remove'),
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Team</h1>
                    <p className="text-muted-foreground mt-1">Manage team members and roles.</p>
                </div>
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Team Member</DialogTitle>
                            <DialogDescription>Add a new member to your organization.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => inviteMutation.mutate({ email, name, password, role })}
                                disabled={!email || !name || !password || inviteMutation.isPending}
                            >
                                {inviteMutation.isPending ? 'Adding...' : 'Add Member'}
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
            ) : members.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">No team members</h3>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {members.map((member) => {
                        const isCurrentUser = member.userId === user?.id;
                        const initials = member.user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .substring(0, 2);

                        return (
                            <Card key={member.id} className="group">
                                <CardContent className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{member.user.name}</span>
                                                {isCurrentUser && (
                                                    <Badge variant="outline" className="text-xs">You</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{member.user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className={
                                                member.role === 'admin'
                                                    ? 'bg-primary/10 text-primary border-primary/20'
                                                    : ''
                                            }
                                        >
                                            {member.role === 'admin' ? (
                                                <><Shield className="h-3 w-3 mr-1" /> Admin</>
                                            ) : (
                                                <><User className="h-3 w-3 mr-1" /> Member</>
                                            )}
                                        </Badge>
                                        {!isCurrentUser && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            updateRoleMutation.mutate({
                                                                id: member.id,
                                                                role: member.role === 'admin' ? 'member' : 'admin',
                                                            })
                                                        }
                                                    >
                                                        <Shield className="h-4 w-4 mr-2" />
                                                        Make {member.role === 'admin' ? 'Member' : 'Admin'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => removeMutation.mutate(member.id)}
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <UserMinus className="h-4 w-4 mr-2" /> Remove
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
