import { createWriteStream } from 'fs';
import Logger from 'log4js';
import { Readable } from 'node:stream';
import { finished } from 'stream/promises';
import cache from './cache.js';

const logger = Logger.getLogger('net');

async function loadFile(url: string): Promise<string> {
    logger.info('Loading file', url);

    const webStream = await getWebStream(url);
    const filePath = cache.getTempFileName(cache.getExt(url));
    const fileStream = createWriteStream(filePath);
    await finished(webStream.pipe(fileStream));

    return filePath;
}

const MAX_REDIRECTS = 5;
async function getWebStream(url: string, redirects = 0): Promise<Readable> {
    if (redirects > MAX_REDIRECTS) {
        throw new Error('Too many redirects');
    }
    const resp = await fetch(url);
    // ok
    if ((resp.status & 200) === 200) {
        if (!resp.body) {
            throw new Error(`Failed to get "${url}": response has no body`);
        }
        return Readable.fromWeb(resp.body as any);
    }
    // redirect
    if ((resp.status & 300) === 300) {
        const loc = resp.headers.get('Location');
        if (!loc) {
            throw new Error(`Failed to get "${url}": status code ${resp.status}, but no Location header`);
        }
        logger.info('Redirecting', url, '->', loc);
        return getWebStream(loc, redirects + 1);
    }
    // failed
    throw new Error(`Failed to get "${url}": status code ${resp.status} ${resp.statusText}`);
}

export default {
    loadFile
};
