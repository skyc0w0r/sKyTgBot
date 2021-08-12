import { spawn, spawnSync } from 'child_process';
import { Readable } from 'stream';
import cache from './cache';
import logger from './logger';

// magic number introduction
const MAX_FFMPEG_PARALLEL = 6;
let ffmpegsNow = 0;

let ffmpegCmd: string | undefined = undefined;
function findFfmpeg() {
    for (const command of ['ffmpeg', 'avconv', './ffmpeg', './avconv', 'ffmpeg.exe', './ffmpeg.exe']) {
        if (!spawnSync(command, ['-h']).error) ffmpegCmd = command;
    }
    if (!ffmpegCmd) {
        throw new Error('ffmpeg binary not found');
    }
}
if (!ffmpegCmd) {
    findFfmpeg();
}

async function parallelLock(timeout?: number): Promise<void> {
    if (ffmpegsNow >= MAX_FFMPEG_PARALLEL) {
        if (timeout) {
            await new Promise(r => setTimeout(r, timeout));
            if (ffmpegsNow >= MAX_FFMPEG_PARALLEL) {
                throw new Error('Max number of ffmpeg processes already running');
            }
        } else {
            throw new Error('Max number of ffmpeg processes already running');
        }
    }
}

async function convertStreamAAC(input: Readable, outputPath: string, timeout?: number): Promise<void> {
    await parallelLock(timeout);
    ffmpegsNow += 1;

    const proc = spawn(ffmpegCmd, [
        '-i', 'pipe:0',
        '-hide_banner', '-vn',
        '-c:a', 'aac',
        '-b:a', '160k',
        '-f', 'ipod',
        outputPath
    ]);
    return await new Promise<void>((resolve, reject) => {
        proc.on('error', (e) => {
            logger.error('FFmpeg converter failed', e);
            ffmpegsNow -= 1;
            reject(e);
        });
        proc.on('exit', (code) => {
            logger.debug('FFmpeg converter finished with code', code);
            ffmpegsNow -= 1;
            resolve();
        });
        proc.stderr.on('data', (chunck) => {
            // TODO: add progress indication 🤔
            // console.log(chunck.toString());
        });

        input.pipe(proc.stdin);
    });
}

async function addMetadata(filename: string, meta: TrackMetadata, timeout?: number): Promise<void> {
    await parallelLock(timeout);
    ffmpegsNow += 1;

    const tempFile = cache.moveToCache(filename);
    const args = [
        '-i', tempFile,
        '-hide_banner',
    ];
    if (meta) {
        if (meta.coverPath) {
            args.push(...[
                '-i', meta.coverPath,
                '-map', '0',
                '-map', '1',
                '-c', 'copy',
                '-disposition:v:0', 'attached_pic',
            ]);
        }
        for (const key of Object.keys(meta).filter(c => c !== 'coverPath')) {
            args.push(...[
                '-metadata', `${key}=${meta[key]}`
            ]);
        }
    }
    args.push(filename);

    const proc = spawn(ffmpegCmd, args);
    await new Promise<void>((resolve, reject) => {
        proc.on('error', (e) => {
            logger.error('FFmpeg failed', e);
            ffmpegsNow -= 1;
            reject(e);
        });
        proc.on('exit', (code) => {
            logger.debug('FFmpeg finished with code', code);
            ffmpegsNow -= 1;
            resolve();
        });
    });

    cache.removeFromCache(tempFile);
}

function getProcessCount(): number {
    return ffmpegsNow;
}

interface TrackMetadata {
    title?: string
    artist?: string
    composer?: string
    genre?: string
    date?: string
    comment?: string
    coverPath?: string
}

export default {
    convertStreamAAC,
    getProcessCount
};
