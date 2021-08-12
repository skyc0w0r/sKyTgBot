import { inspect } from 'util';

function logInfo(...args: unknown[]): void {
    expandConsole(console.info, ...args);
}

function logDebug(...args: unknown[]): void {
    expandConsole(console.debug, ...args);
}

function logError(...args: unknown[]): void {
    expandConsole(console.error, ...args);
}

// function logInfo(...args: unknown[]): void {
//     console.info(...expandArgs(...args));
// }

// function logDebug(...args: unknown[]): void {
//     console.log(...expandArgs(...args));
// }

// function logError(...args: unknown[]): void {
//     console.error(...expandArgs(...args))
// }

function expandConsole(func: (...args: unknown[]) => void, ...args: unknown[]): void {
    func(...args.map(c => {
        if (typeof c === 'object') {
            return inspect(c, { colors: true, depth: null });
        }
        return c;
    }));
}

function expandArgs(...args: unknown[]): unknown[] {
    return args.map(c => {
        if (typeof c === 'object') {
            return JSON.stringify(c, null, 2);
        }
        return c;
    });
}

export default {
    info: logInfo,
    debug: logDebug,
    error: logError
};
