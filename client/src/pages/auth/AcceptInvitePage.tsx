import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AcceptInvitePage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { setAuthData } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [inviteInfo, setInviteInfo] = useState<{ email: string; teamName: string; orgName: string; userExists: boolean } | null>(null);

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Invalid invite link');
            setLoading(false);
            return;
        }

        api.get(`/auth/invite/${token}`)
            .then((res) => {
                setInviteInfo(res.data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.response?.data?.error || 'Failed to load invite');
                setLoading(false);
            });
    }, [token]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const { data } = await api.post('/auth/accept-invite', {
                token,
                name,
                password,
            });

            setAuthData(data.token, data.user, data.organization);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to accept invite');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                            Back to Login
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Join {inviteInfo?.teamName}</CardTitle>
                    <CardDescription>
                        You have been invited to join the <strong>{inviteInfo?.teamName}</strong> team at <strong>{inviteInfo?.orgName}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAccept} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={inviteInfo?.email} disabled />
                        </div>

                        {!inviteInfo?.userExists && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="Create a secure password"
                                        minLength={6}
                                    />
                                </div>
                            </>
                        )}

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Accept Invitation
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
