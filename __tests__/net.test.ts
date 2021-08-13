import { existsSync, unlinkSync } from 'fs';
import net from '../src/net';

describe('net tests', () => {
    it('Should load file', async () => {
        const filePath = await net.loadFile('https://skycolor.space/index.html');
        expect(existsSync(filePath)).toBeTruthy();
        unlinkSync(filePath);
        expect(existsSync(filePath)).toBeFalsy();
    });

    it('Should load with redirects', async () => {
        const filePath = await net.loadFile('http://skycolor.space/favicon.ico');
        expect(existsSync(filePath)).toBeTruthy();
        unlinkSync(filePath);
        expect(existsSync(filePath)).toBeFalsy();
    });
});
