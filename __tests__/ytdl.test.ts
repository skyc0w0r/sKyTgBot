import { createWriteStream, existsSync } from 'fs';
import FFmpegWrapper from '../src/FFmpegWrapper';
import ytdl from '@distube/ytdl-core';

const flushPromises = () => new Promise(setImmediate);

describe('ytdl test', () => {
    it('Should get video formats', async () => {
        await ytdl.getInfo('https://www.youtube.com/watch?v=n78Gg6_zEQg').then(e => console.log(e));
        expect(console.log).toHaveBeenCalled();
    });
    it('Should download audio', () => {
        ytdl('https://www.youtube.com/watch?v=n78Gg6_zEQg', { filter: 'audioonly' }).pipe(createWriteStream('./test.bin'));
        expect(existsSync('./test.bin')).toBeTruthy();
    });
    it('Should convert audio stream to aac', async () => {
        const sourceStream = ytdl('https://www.youtube.com/watch?v=n78Gg6_zEQg', { filter: 'audioonly' });
        const promise = FFmpegWrapper.convertStreamAAC(sourceStream, './test.m4a');
        expect(FFmpegWrapper.getProcessCount()).toBe(1);
        await promise;
        expect(FFmpegWrapper.getProcessCount()).toBe(0);
    });
});
