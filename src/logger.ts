import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';
import { inspect } from 'util';

type LogLevel = 'INFO' | 'DEBUG' | 'ERROR';

function logInfo(...args: unknown[]): void {
    expandConsole(console.info, ...args);
    logToFile('INFO', ...expandArgs(...args));
}

function logDebug(...args: unknown[]): void {
    expandConsole(console.debug, ...args);
    logToFile('DEBUG', ...expandArgs(...args));
}

function logError(...args: unknown[]): void {
    expandConsole(console.error, ...args);
    logToFile('ERROR', ...expandArgs(...args));
}

function expandConsole(func: (...args: unknown[]) => void, ...args: unknown[]): void {
    func(...args.map(c => {
        if (typeof c === 'object') {
            return inspect(c, { colors: true, depth: null });
        }
        return c;
    }));
}

function expandArgs(...args: unknown[]): string[] {
    return args.map(c => {
        if (typeof c === 'object') {
            return JSON.stringify(c, null, 2);
        }
        return c.toString();
    });
}


function pad(s: number, n = 2): string {
    return s.toString().padStart(n, '0');
}
const now = new Date();
let logFileName = `./${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}.log`;
logFileName = join(process.cwd(), logFileName);
function logToFile(level: LogLevel, ...args: string[]): void {
    writeQueue.push({
        level,
        time: new Date(),
        message: args
    });
    writeFile();
}

const writeQueue = new Array<logMessage>();
let isWriting = false;
async function writeFile(): Promise<void> {
    if (isWriting) {
        return;
    }
    isWriting = true;
    while (writeQueue.length > 0) {
        const msg = writeQueue.shift();
    
        const s = createWriteStream(logFileName, {encoding: 'utf-8', flags: 'a'});
        await writeWrap(s, getTime(msg.time));
        await writeWrap(s, msg.level.padStart(6, ' '));
        for (const t of msg.message) {
            await writeWrap(s, ' ');
            await writeWrap(s, t);
        }
        await writeWrap(s, '\n');
        s.close();
    }
    isWriting = false;
}

const getTime = (date: Date): string => {
    return `[${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}]`;
};
const writeWrap = (s: WriteStream, chunk: unknown): Promise<void> =>
    new Promise((resolve, reject) => {
        s.write(chunk, (e) => {
            if (e) {
                reject(e);
            }
            resolve();
        });
    });


interface logMessage {
    level: LogLevel
    time: Date
    message: string[]
}

export default {
    info: logInfo,
    debug: logDebug,
    error: logError
};
