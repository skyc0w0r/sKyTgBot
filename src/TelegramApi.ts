import fetch from 'node-fetch';
import { FormData, fileFromPathSync } from 'formdata-node';
import { FormDataEncoder } from 'form-data-encoder';
import RequestParams from './Model/Internal/RequestParams';
import UnknownJsonResponse from './Model/Internal/UnknownJsonResponse';
import Message from './Model/Telegram/Message';
import Webhook from './Model/Telegram/Webhook';
import { Readable } from 'stream';
import TelegramResponseWrapper from './Model/Internal/TelegramResponseWrapper';
import RequestFile from './Model/Internal/RequestFile';

const TG_BASE_API_ADDRESS = 'https://api.telegram.org/bot';
// const TG_BASE_API_ADDRESS = 'http://localhost:1337/bot';

class TelegramApi {
    private token: string;
    constructor(botToken: string) {
        this.token = botToken;
    }

    public GetWebhookInfo(): Promise<Webhook> {
        return this.getData('getWebhookInfo', Webhook);
        // return this.getDataUnknown('getWebhookInfo').then(e => e as Webhook);
    }

    public SetWebHook(hookUrl: string): Promise<boolean> {
        return this.postData('setWebhook', Boolean, { url: hookUrl}).then(res => res as boolean);
    }

    /**
     * Use this method to send text messages. On success, the sent `Message` is returned.
     * @param chat Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
     * @param text 
     * @param replyTo 
     * @returns 
     */
    public SendMessage(chat: number | string, text: string, replyTo?: number): Promise<Message> {
        const p: RequestParams = {
            chat_id: chat,
            text,
        };
        if (replyTo) {
            p.reply_to_message_id = replyTo;
        }
        return this.postData('sendMessage', Message, p);
    }

    public sendPhoto(chat: number | string, photo: RequestFile, caption: string, replyTo?: number): Promise<Message> {
        const p: RequestParams = {
            chat_id: chat,
            photo,
            caption,
        };
        if (replyTo) {
            p.reply_to_message_id = replyTo;
        }
        return this.postDataMultipart('sendPhoto', Message, p);
    }


    private getDataUnknown(method: string, params?: RequestParams): Promise<unknown> {
        return this.getData(method, UnknownJsonResponse, params).then(e => e.data);
    }

    private postDataUnknown(method: string, params?: RequestParams): Promise<unknown> {
        return this.postData(method, UnknownJsonResponse, params).then(e => e.data);
    }

    private getData<Type>(method: string, TypeNew: new(obj?: unknown) => Type, params?: RequestParams): Promise<Type> {
        let url = `${TG_BASE_API_ADDRESS}${this.token}/${method}`;
        if (params) {
            const paramString = Object.keys(params).map(p => `${p}=${escape(params[p] as string)}`).join('&');
            url += '?' + paramString;
        }
        return fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        }).then(resp => {
            if (!resp.ok) {
                throw new Error(`Failed to get /${method}: ${resp.status} ${resp.statusText}`);
            }
            return resp.json();
        }).then(j => {
            const res =  new TelegramResponseWrapper(TypeNew, j);
            if (!res.Ok) {
                throw new Error(res.Description);
            }
            return res.Inner;
        });
    }

    private postData<Type>(method: string, TypeNew: new(obj?: unknown) => Type, params?: RequestParams): Promise<Type> {
        const url = `${TG_BASE_API_ADDRESS}${this.token}/${method}`;
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        }).then(resp => {
            if (!resp.ok) {
                throw new Error(`Failed to post /${method}: ${resp.status} ${resp.statusText}`);
            }
            return resp.json();
        }).then(j => {
            const res =  new TelegramResponseWrapper(TypeNew, j);
            if (!res.Ok) {
                throw new Error(res.Description);
            }
            return res.Inner;
        });
    }

    private postDataMultipart<Type>(method: string, TypeNew: new(obj?: unknown) => Type, params: RequestParams): Promise<Type> {
        const url = `${TG_BASE_API_ADDRESS}${this.token}/${method}`;
        const data = new FormData();
        for (const key in params) {
            const v = params[key];
            if (isReqFile(v)) {
                data.append(key, fileFromPathSync(v.path), { type: v.mime });
            } else {
                data.append(key, params[key]);
            }
        }
        const encoder = new FormDataEncoder(data);

        return fetch(url, {
            method: 'POST',
            body: Readable.from(encoder.encode()),
            headers: encoder.headers
        }).then(resp => {
            if (!resp.ok) {
                throw new Error(`Failed to post /${method}: ${resp.status} ${resp.statusText}`);
            }
            return resp.json();
        }).then(j => {
            const res =  new TelegramResponseWrapper(TypeNew, j);
            if (!res.Ok) {
                throw new Error(res.Description);
            }
            return res.Inner;
        });
    }
}

// should be moved to RequestFile.ts
function isReqFile(obj: unknown): obj is RequestFile {
    return obj['path'] && obj['mime'];
}

export default TelegramApi;
