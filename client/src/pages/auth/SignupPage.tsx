import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { checkSlug } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Check, X, Loader2 } from 'lucide-react';

export default function SignupPage() {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [orgName, setOrgName] = useState('');
    const [slug, setSlug] = useState('');
    const [isSlugManual, setIsSlugManual] = useState(false);
    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Slug generation and validation
    useEffect(() => {
        if (!orgName || isSlugManual) return;

        const generated = orgName
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '');

        setSlug(generated);
    }, [orgName, isSlugManual]);

    useEffect(() => {
        const validateSlug = async () => {
            if (!slug) {
                setSlugStatus('idle');
                return;
            }

            // Regex: min 3 chars, max 50, lowercase letters, numbers, hyphens, no consecutive hyphens, start/end with alnum
            const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
            if (slug.length < 3 || slug.length > 50 || !slugRegex.test(slug) || slug.includes('--')) {
                setSlugStatus('invalid');
                return;
            }

            setSlugStatus('checking');
            try {
                const available = await checkSlug(slug);
                setSlugStatus(available ? 'available' : 'taken');
            } catch (err) {
                console.error('Failed to check slug', err);
                setSlugStatus('idle'); // Fail gracefully
            }
        };

        const timeoutId = setTimeout(validateSlug, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);
    }, [slug]);

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSlug(e.target.value);
        setIsSlugManual(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (slugStatus === 'taken' || slugStatus === 'invalid') {
            setError('Please fix the URL errors before continuing.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await signup(name, email, password, orgName, slug);
            navigate('/dashboard/services');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 px-4">
            <Card className="w-full max-w-md shadow-xl border-border/50">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
                        <Zap className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
                        <CardDescription className="mt-1">Set up your organization's status page</CardDescription>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="orgName">Organization Name</Label>
                            <Input
                                id="orgName"
                                placeholder="Acme Corp"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug">Status Page URL</Label>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-muted-foreground text-sm select-none">
                                    yourapp.com/status/
                                </div>
                                <Input
                                    id="slug"
                                    className="pl-[145px] pr-8 lowercase font-mono"
                                    placeholder="acme-corp"
                                    value={slug}
                                    onChange={handleSlugChange}
                                    required
                                />
                                <div className="absolute right-3 top-2.5">
                                    {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    {slugStatus === 'available' && <Check className="h-4 w-4 text-emerald-500" />}
                                    {slugStatus === 'taken' && <X className="h-4 w-4 text-destructive" />}
                                    {slugStatus === 'invalid' && <X className="h-4 w-4 text-destructive" />}
                                </div>
                            </div>
                            {slugStatus === 'taken' && <p className="text-xs text-destructive">This URL is already taken.</p>}
                            {slugStatus === 'invalid' && <p className="text-xs text-destructive">Use 3-50 lowercase letters, numbers, or hyphens.</p>}
                            {slugStatus === 'available' && <p className="text-xs text-emerald-600">✓ Available</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button type="submit" className="w-full" disabled={loading || slugStatus === 'checking' || slugStatus === 'taken' || slugStatus === 'invalid'}>
                            {loading ? 'Creating account...' : 'Create account'}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-primary hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
