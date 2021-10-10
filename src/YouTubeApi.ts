import fetch from 'node-fetch';
import ytdl from 'ytdl-core';
import { Readable } from 'stream';
import RequestParams from './Model/Internal/RequestParams.js';
import Video from './Model/YouTube/Video.js';
import VideosResponse from './Model/YouTube/VideosResponse.js';

const YT_BASE_DATA_API_ADDRESS = 'https://youtube.googleapis.com/youtube/v3';

class YouTubeApi {
    private token: string;
    constructor(accessToken: string) {
        this.token = accessToken;
    }

    public getVideoInfo(id: string): Promise<Video | null> {
        return this.getData('videos', VideosResponse, {
            part: 'contentDetails,snippet',
            id
        }).then(r => r.Items.length > 0 ? r.Items[0] : null);
    }

    public getAudioStream(id: string): Readable {
        return ytdl(id, { filter: 'audioonly' });
    }

    private getData<Type>(method: string, TypeNew: new(obj?: unknown) => Type, params?: RequestParams): Promise<Type> {
        let url = `${YT_BASE_DATA_API_ADDRESS}/${method}?key=${this.token}&`;
        if (params) {
            const paramString = Object.keys(params).map(p => `${p}=${escape(params[p] as string)}`).join('&');
            url += paramString;
        }
        return fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }).then(resp => {
            if (!resp.ok) {
                throw new Error(`Failed to get /${method}: ${resp.status} ${resp.statusText}`);
            }
            return resp.json();
        }).then(j => {
            return new TypeNew(j);
        });
    }
}

export default YouTubeApi;
