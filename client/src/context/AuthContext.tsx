import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { User, Organization, AuthResponse, MeResponse } from '@/types';

interface AuthContextType {
    user: User | null;
    organization: Organization | null;
    role: string | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string, organizationName: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const fetchMe = useCallback(async () => {
        try {
            const { data } = await api.get<MeResponse>('/auth/me');
            setUser(data.user);
            setOrganization(data.organization);
            setRole(data.role);
        } catch {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setOrganization(null);
            setRole(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchMe();
        } else {
            setIsLoading(false);
        }
    }, [token, fetchMe]);

    const login = async (email: string, password: string) => {
        const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setOrganization(data.organization);
    };

    const signup = async (name: string, email: string, password: string, organizationName: string) => {
        const { data } = await api.post<AuthResponse>('/auth/signup', {
            name,
            email,
            password,
            organizationName,
        });
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setOrganization(data.organization);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setOrganization(null);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{ user, organization, role, token, isLoading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
