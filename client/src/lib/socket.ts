import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            transports: ['websocket', 'polling'],
        });
    }
    return socket;
}

export function connectSocket(): Socket {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
    }
    return s;
}

export function disconnectSocket(): void {
    if (socket?.connected) {
        socket.disconnect();
    }
}

export function joinOrgRoom(orgId?: string, orgSlug?: string): void {
    const s = getSocket();
    if (s.connected) {
        s.emit('join:org', { orgId, orgSlug });
    }
}

export function leaveOrgRoom(orgId: string): void {
    const s = getSocket();
    if (s.connected) {
        s.emit('leave:org', { orgId });
    }
}
