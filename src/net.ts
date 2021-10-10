import { createWriteStream } from 'fs';
import fetch from 'node-fetch';
import cache from './cache.js';
import logger from './logger.js';

function loadFile(url: string): Promise<string> {
    logger.info('Loading file', url);
    return getBlob(url).then(b => {
        const filePath = cache.getTempFileName(cache.getExt(url));
        const fileStream = createWriteStream(filePath);
        b.pipe(fileStream);
        return new Promise<string>((resolve, reject) => {
            b.on('finish', () => {
                logger.info('Loading complete', filePath);
                resolve(filePath);
            });
            b.on('error', (e) => {
                reject(e);
            });
        });
    });
}

const MAX_REDIRECTS = 5;
function getBlob(url: string, redirects = 0): Promise<NodeJS.ReadableStream> {
    if (redirects > MAX_REDIRECTS) {
        throw new Error('Too many redirects');
    }
    return fetch(url)
        .then(resp => {
            // ok
            if ((resp.status & 200) === 200) {
                if (!resp.body) {
                    throw new Error(`Failed to get "${url}": response has no body`);
                }
                return resp.body;
            }
            // redirect
            if ((resp.status & 300) === 300) {
                const loc = resp.headers.get('Location');
                if (!loc) {
                    throw new Error(`Failed to get "${url}": status code ${resp.status}, but no Location header`);
                }
                logger.info('Redirecting', url, '->', loc);
                return getBlob(loc, redirects + 1);
            }
            // failed
            throw new Error(`Failed to get "${url}": status code ${resp.status} ${resp.statusText}`);
        });
}

export default {
    loadFile
};
