import ytdl from '@distube/ytdl-core';
import Logger from 'log4js';
import { PassThrough, Readable } from 'stream';
import RequestParams from './Model/Internal/RequestParams.js';
import Video from './Model/YouTube/Video.js';
import VideosResponse from './Model/YouTube/VideosResponse.js';
import config from './config.js';
import { spawn, spawnSync } from 'child_process';

const YT_BASE_DATA_API_ADDRESS = 'https://youtube.googleapis.com/youtube/v3';
const logger = Logger.getLogger('cache');

class YouTubeApi {
    private token: string;
    private useExternalLoader: boolean;
    private externalLoaderCmd: string;
    constructor() {
        this.token = config.get().YT_DATA_TOKEN;
        this.useExternalLoader = config.get().YT_EXTERNAL_LOADER;
    }

    public getVideoInfo(id: string): Promise<Video | null> {
        return this.getData('videos', VideosResponse, {
            part: 'contentDetails,snippet',
            id
        }).then(r => r.Items.length > 0 ? r.Items[0] : null);
    }

    public getAudioStream(id: string): Readable {
        logger.info('Loading video:', id);
        if (this.useExternalLoader) {
            if (this.tryFindExternalLoader()) {
                return this.getAudioStreamExternal(id);
            }
        }
        return this.getAudioStreamInternal(id);
    }

    private tryFindExternalLoader() {
        if (!this.externalLoaderCmd) {
            for (const command of ['yt-dlp', './yt-dlp', 'yt-dlp.exe', './yt-dlp.exe']) {
                if (!spawnSync(command, ['-h']).error) {
                    this.externalLoaderCmd = command;
                    logger.debug('Found yt-dlp as', this.externalLoaderCmd);
                    break;
                }
            }

            if (!this.externalLoaderCmd) {
                this.useExternalLoader = false;
                logger.warn('External loader enabled, but no yt-dlp found!');
                return false;
            }
        }

        return true;
    }

    private getAudioStreamInternal(id: string): Readable {
        return ytdl(id, { filter: 'audioonly' });
    }

    private getAudioStreamExternal(id: string): Readable {
        const pt = new PassThrough({
            highWaterMark: 10 * 1024 * 1024,
        });

        const child = spawn(this.externalLoaderCmd, [
            '-x', '-o', '-',
            `https://youtu.be/${id}`,
        ]);

        child.stdout.pipe(pt);

        return pt;
    }

    private async getData<Type>(method: string, TypeNew: new(obj?: unknown) => Type, params?: RequestParams): Promise<Type> {
        let url = `${YT_BASE_DATA_API_ADDRESS}/${method}?key=${this.token}&`;
        if (params) {
            const paramString = Object.keys(params).map(p => `${p}=${escape(params[p] as string)}`).join('&');
            url += paramString;
        }

        const resp = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to get /${method}: ${resp.status} ${resp.statusText}`);
        }

        const j = await resp.json();
        return new TypeNew(j);
    }
}

export default YouTubeApi;
