import { existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { isAbsolute, join } from 'path';
import shortid from 'shortid';

const cachePath = join(process.cwd(), 'cache');
if (!existsSync(cachePath)) {
    mkdirSync(cachePath);
}

function getTempFileName(ext: string): string {
    const maxRetries = 0;
    let retries = 0;
    while (retries < maxRetries) {
        const name = shortid.generate();
        if (!ext.startsWith('.')) {
            ext = '.' + ext;
        }
        const res = join(cachePath, `${name}${ext}`);
        if (!existsSync(res)) {
            return res;
        }
        retries++;
    }
    throw new Error('Failed to get temporary filename (how?)');
}

function getExt(filePath: string): string {
    if (!filePath.includes('.')) {
        // no extention
        return 'bin';
    }
    const tokens = filePath.split('.');
    return tokens[tokens.length - 1];
}

function moveToCache(sourcePath: string): string {
    const targetPath = getTempFileName(getExt(sourcePath));
    renameSync(sourcePath, targetPath);
    return targetPath;
}

function removeFromCache(filePath: string): void {
    if (!filePath.startsWith(cachePath)) {
        if (isAbsolute(cachePath)) {
            throw new Error(`Unable to remove file not from cache: ${filePath}`);
        }
        filePath = join(cachePath, filePath);
        if (!filePath.startsWith(cachePath)) {
            throw new Error(`Unable to remove file not from cache: ${filePath}`);
        }
    }
    // Ахуенные нэйминги
    unlinkSync(filePath);
}

export default {
    getTempFileName,
    getExt,
    moveToCache,
    removeFromCache
};
