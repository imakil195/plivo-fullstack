import { useState } from 'react';
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
import { Copy, Mail, MoreVertical, Plus, Shield, User, UserMinus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TeamPage() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('member');
    const [isQuickAdd, setIsQuickAdd] = useState(false);
    const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
    const [quickAddResult, setQuickAddResult] = useState<any>(null);
    const navigate = useNavigate();
    const { setAuthData } = useAuth();

    const { data: members = [], isLoading: loadingMembers } = useQuery<TeamMember[]>({
        queryKey: ['teamMembers'],
        queryFn: async () => (await api.get('/teams/members')).data,
    });

    const { data: invites = [] } = useQuery<any[]>({
        queryKey: ['teamInvites'],
        queryFn: async () => (await api.get('/teams/invites')).data,
    });

    const inviteMutation = useMutation({
        mutationFn: (data: any) =>
            isQuickAdd ? api.post('/teams/quick-add', data) : api.post('/teams/invite', data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
            queryClient.invalidateQueries({ queryKey: ['teamInvites'] });

            if (res.data.directAdded) {
                setInviteOpen(false);
                setEmail('');
                setName('');
                setRole('member');
                toast.success('User already has an account and has been added to the team!');
            } else if (!isQuickAdd && res.data.token) {
                const baseUrl = window.location.origin;
                const link = `${baseUrl}/accept-invite?token=${res.data.token}`;
                setLastInviteLink(link);
                toast.success('Invite created! You can copy the link below.');
            } else if (isQuickAdd) {
                setQuickAddResult(res.data);
                toast.success('User added directly!');
            } else {
                setInviteOpen(false);
                setEmail('');
                setName('');
                setRole('member');
                toast.success('Invite sent successfully');
            }
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to process request'),
    });

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Link copied to clipboard');
    };

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
                <div className="flex gap-2">
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Invite Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{isQuickAdd ? 'Directly Add Member' : 'Invite Team Member'}</DialogTitle>
                                <DialogDescription>
                                    {isQuickAdd
                                        ? 'Instantly add a user to your team (bypasses email).'
                                        : 'Send an invitation to join your organization.'}
                                </DialogDescription>
                            </DialogHeader>

                            {lastInviteLink || quickAddResult ? (
                                <div className="space-y-4 py-4">
                                    {lastInviteLink && (
                                        <>
                                            <div className="p-3 bg-muted rounded-md break-all text-sm font-mono">
                                                {lastInviteLink}
                                            </div>
                                            <Button className="w-full" onClick={() => copyToClipboard(lastInviteLink)}>
                                                <Copy className="h-4 w-4 mr-2" />
                                                Copy Link
                                            </Button>
                                        </>
                                    )}

                                    {quickAddResult && (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 text-sm">
                                                <p className="font-medium text-primary">User added successfully!</p>
                                                <p className="text-muted-foreground mt-1">
                                                    Email: <span className="text-foreground font-mono">{quickAddResult.member.user.email}</span><br />
                                                    Password: <span className="text-foreground font-mono">demo123!</span>
                                                </p>
                                            </div>
                                            <Button
                                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                                onClick={() => {
                                                    setAuthData(quickAddResult.token, quickAddResult.member.user, quickAddResult.organization);
                                                    toast.success(`Switched to ${quickAddResult.member.user.name}`);
                                                    navigate('/');
                                                }}
                                            >
                                                <Users className="h-4 w-4 mr-2" />
                                                Switch to this Account
                                            </Button>
                                        </div>
                                    )}

                                    <Button variant="outline" className="w-full" onClick={() => {
                                        setLastInviteLink(null);
                                        setQuickAddResult(null);
                                        setInviteOpen(false);
                                        setEmail('');
                                        setName('');
                                    }}>
                                        Close
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4 py-4">
                                        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium">Direct Add (Demo)</Label>
                                                <p className="text-xs text-muted-foreground text-wrap pe-4">Bypass email and add user immediately.</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                checked={isQuickAdd}
                                                onChange={(e) => setIsQuickAdd(e.target.checked)}
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

                                        {isQuickAdd && (
                                            <div className="space-y-2">
                                                <Label>Full Name</Label>
                                                <Input
                                                    placeholder="John Doe"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                />
                                            </div>
                                        )}

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
                                            onClick={() => inviteMutation.mutate(isQuickAdd ? { email, name, role } : { email, role })}
                                            disabled={!email || (isQuickAdd && !name) || inviteMutation.isPending}
                                        >
                                            {inviteMutation.isPending ? 'Processing...' : isQuickAdd ? 'Add Member' : 'Send Invite'}
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Members
                    </h2>
                    {loadingMembers ? (
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

                {invites.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Pending Invitations
                        </h2>
                        <div className="space-y-3">
                            {invites.map((invite) => (
                                <Card key={invite.id}>
                                    <CardContent className="flex items-center justify-between py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{invite.email}</p>
                                                <p className="text-xs text-muted-foreground">Expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="capitalize">{invite.role}</Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={() => copyToClipboard(invite.link)}
                                                title="Copy Invite Link"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => {
                                                    api.delete(`/teams/invites/${invite.id}`).then(() => {
                                                        queryClient.invalidateQueries({ queryKey: ['teamInvites'] });
                                                        toast.success('Invite revoked');
                                                    });
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
