import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, joinOrgRoom, getSocket } from '@/lib/socket';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { organization } = useAuth();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = connectSocket();
        socketRef.current = socket;

        socket.on('connect', () => {
            if (organization?.id) {
                joinOrgRoom(organization.id);
            }
        });

        return () => {
            disconnectSocket();
        };
    }, [organization?.id]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current || getSocket() }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}
