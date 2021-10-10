import { existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { isAbsolute, join } from 'path';
import shortid from 'shortid';
import mmagic from 'mmmagic';

const cachePath = join(process.cwd(), 'cache');
if (!existsSync(cachePath)) {
    mkdirSync(cachePath);
}
const magic = new mmagic.Magic(mmagic.MAGIC_MIME_TYPE);

function getTempFileName(ext: string): string {
    const maxRetries = 5;
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
    filePath = normalyzePath(filePath);
    // Ахуенные нэйминги
    unlinkSync(filePath);
}

function getMime(filepath: string): Promise<string> {
    filepath = normalyzePath(filepath);
    return new Promise<string>((resolve, reject) => {
        magic.detectFile(filepath, (err, res) => {
            if (err) {
                reject(err);
            }
            let mime = '';
            if (Array.isArray(res)) {
                if (res.length > 0) {
                    mime = res[0];
                }
            } else {
                mime = res as string;
            }
            resolve(mime);
        });
    });
}

function normalyzePath(filePath: string): string {
    if (!filePath.startsWith(cachePath)) {
        if (isAbsolute(filePath)) {
            throw new Error(`File not from cache: ${filePath}`);
        }
        filePath = join(cachePath, filePath);
        if (!filePath.startsWith(cachePath)) {
            throw new Error(`File not from cache: ${filePath}`);
        }
    }
    return filePath;
}

export default {
    getTempFileName,
    getExt,
    moveToCache,
    removeFromCache,
    getMime
};
