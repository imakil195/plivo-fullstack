import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
    Activity,
    AlertTriangle,
    Calendar,
    LogOut,
    Menu,
    Settings,
    Users,
    X,
    Zap,
    Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const navItems = [
    { label: 'Services', href: '/dashboard/services', icon: Activity },
    { label: 'Incidents', href: '/dashboard/incidents', icon: AlertTriangle },
    { label: 'Maintenance', href: '/dashboard/maintenance', icon: Calendar },
    { label: 'Team', href: '/dashboard/team', icon: Users },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { organization, user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-full flex-col">
            {/* Logo / Org name */}
            <div className="flex items-center gap-3 px-6 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                    <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold truncate">{organization?.name || 'StatusPage'}</h2>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <Separator />

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <Separator />

            {/* Bottom actions */}
            <div className="px-3 py-4 space-y-1">
                <Link
                    to={`/status/${organization?.slug || ''}`}
                    target="_blank"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150"
                >
                    <Globe className="h-4 w-4" />
                    View Public Page
                </Link>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </button>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex h-screen bg-background">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card">
                <SidebarContent />
            </aside>

            {/* Mobile sidebar */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 md:hidden">
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                    <SidebarContent onClose={() => setOpen(false)} />
                </SheetContent>
            </Sheet>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="mx-auto max-w-5xl px-6 py-8 md:py-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
