import { existsSync, writeFileSync } from 'fs';
import cache from '../src/cache';

describe('cache tests', () => {
    let testFilePath = '';
    it('Should create text file in cache', () => {
        testFilePath = cache.getTempFileName('txt');
        expect(existsSync(testFilePath)).toBeFalsy();

        writeFileSync(testFilePath, 'Hello world');
        expect(existsSync(testFilePath)).toBeTruthy();
    });

    it('Should move file to cache', () => {
        expect(existsSync(testFilePath)).toBeTruthy();

        const newFile = cache.moveToCache(testFilePath);
        expect(existsSync(testFilePath)).toBeFalsy();
        expect(existsSync(newFile)).toBeTruthy();
        testFilePath = newFile;
    });

    it('Should get extention of file', () => {
        const ext = cache.getExt(testFilePath);
        expect(ext).toBe('txt');
    });

    it('Should get mime type of file', async () => {
        const mime = await cache.getMime(testFilePath);
        expect(mime).toBe('text/plain');
    });

    it('Should delete file from cache', () => {
        cache.removeFromCache(testFilePath);
        expect(existsSync(testFilePath)).toBeFalsy();
    });
});
