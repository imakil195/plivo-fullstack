import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'server.log');

export function log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}\n`;

    // Log to console (in case it works)
    console.log(message, data || '');

    // Append to file
    try {
        fs.appendFileSync(logFile, logMessage);
    } catch (err) {
        // Ignore file errors to prevent crash
    }
}
