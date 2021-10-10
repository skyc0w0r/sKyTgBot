import fetch from 'node-fetch';
import { FormData, fileFromPathSync } from 'formdata-node';
import { FormDataEncoder } from 'form-data-encoder';
import RequestParams from './Model/Internal/RequestParams.js';
import Message from './Model/Telegram/Message.js';
import Webhook from './Model/Telegram/Webhook.js';
import { Readable } from 'stream';
import TelegramResponseWrapper from './Model/Internal/TelegramResponseWrapper.js';
import RequestFile from './Model/Internal/RequestFile.js';
import MessageEntity from './Model/Telegram/MessageEntity.js';

type ChatAction = 'typing' | 'upload_photo' | 'record_video' | 'upload_video' | 'record_voice' | 'upload_voice' | 'upload_document' | 'find_location' | 'record_video_note' | 'upload_video_note';
type ParseMode = 'MarkdownV2' | 'HTML' | 'Markdown';

const TG_BASE_API_ADDRESS = 'https://api.telegram.org/bot';
// const TG_BASE_API_ADDRESS = 'http://localhost:1337/bot';

class TelegramApi {
    private token: string;
    constructor(botToken: string) {
        this.token = botToken;
    }

    public async GetWebhookInfo(): Promise<Webhook> {
        return await this.getData('getWebhookInfo', Webhook);
        // return this.getDataUnknown('getWebhookInfo').then(e => e as Webhook);
    }

    public async SetWebHook(hookUrl: string): Promise<boolean> {
        const res = await this.postData('setWebhook', Boolean, { url: hookUrl });
        return res as boolean;
    }

    /**
     * Use this method to send text messages. On success, the sent `Message` is returned.
     * @param chat Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
     * @param text 
     * @param replyTo 
     * @returns 
     */
    public async SendMessage(chat: number | string, text: string, replyTo?: number, entities?: Array<MessageEntity>, parseMode: ParseMode = 'MarkdownV2'): Promise<Message> {
        const p: RequestParams = {
            chat_id: chat,
            text,
        };
        if (entities) {
            p.entities = entities.map(e => e.toJson());
        } else {
            p.parse_mode = parseMode;
        }
        if (replyTo) {
            p.reply_to_message_id = replyTo;
        }
        return await this.postData('sendMessage', Message, p);
    }

    /**
     * Use this method to send photos. On success, the sent Message is returned.
     * @param chat 
     * @param photo 
     * @param caption 
     * @param replyTo 
     * @returns 
     */
    public async SendPhoto(chat: number | string, photo: RequestFile | string, caption: string, replyTo?: number, parseMode: ParseMode = 'MarkdownV2'): Promise<Message> {
        const p: RequestParams = {
            chat_id: chat,
            photo,
            caption,
            parse_mode: parseMode,
        };
        if (replyTo) {
            p.reply_to_message_id = replyTo;
        }
        return await this.postDataMultipart('sendPhoto', Message, p);
    }

    /**
     * Use this method to send audio files, if you want Telegram clients to display them in the music player. Your audio must be in the .MP3 or .M4A format
     * @param chat 
     * @param audio 
     * @param caption 
     * @param replyTo 
     * @param thumb The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail's width and height should not exceed 320.
     * @returns On success, the sent Message is returned
     */
    public async SendAudio(chat: number | string, audio: RequestFile | string, caption: string, duration?: number, performer?: string, title?: string, thumb?: RequestFile, replyTo?: number, parseMode: ParseMode = 'MarkdownV2'): Promise<Message> {
        const p: RequestParams = {
            chat_id: chat,
            audio,
            caption,
            parseMode: parseMode,
        };
        if (duration) {
            p.duration = duration;
        }
        if (performer) {
            p.performer = performer;
        }
        if (title) {
            p.title = title;
        }
        if (thumb) {
            p.thumb = thumb;
        }
        if (replyTo) {
            p.reply_to_message_id = replyTo;
        }
        return await this.postDataMultipart('sendAudio', Message, p);
    }

    /**
     * Use this method when you need to tell the user that something is happening on the bot's side. The status is set for 5 seconds or less
     * @param chat 
     * @param action 
     * @returns Returns True on success
     */
    public async SendChatAction(chat: number | string, action: ChatAction): Promise<boolean> {
        const p: RequestParams = {
            chat_id: chat,
            action
        };
        const res = await this.postData('sendChatAction', Boolean, p);
        return res as boolean;
    }


    private async getData<Type>(method: string, TypeNew: new(obj?: unknown) => Type, params?: RequestParams): Promise<Type> {
        let url = `${TG_BASE_API_ADDRESS}${this.token}/${method}`;
        if (params) {
            const paramString = Object.keys(params).map(p => `${p}=${escape(params[p] as string)}`).join('&');
            url += '?' + paramString;
        }
        const resp = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });
        if (!resp.ok && !resp.body) {
            throw new Error(`Failed to get /${method}: ${resp.status} ${resp.statusText}`);
        }
        const j = await resp.json();
        const res = new TelegramResponseWrapper(TypeNew, j);
        if (!res.Ok) {
            throw new Error(`Failed to get /${method}: ${res.Description}`);
        }
        return res.Inner;
    }

    private async postData<Type>(method: string, TypeNew: new(obj?: unknown) => Type, params?: RequestParams): Promise<Type> {
        const url = `${TG_BASE_API_ADDRESS}${this.token}/${method}`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });
        if (!resp.ok && !resp.body) {
            throw new Error(`Failed to post /${method}: ${resp.status} ${resp.statusText}`);
        }
        const j = await resp.json();
        const res = new TelegramResponseWrapper(TypeNew, j);
        if (!res.Ok) {
            throw new Error(`Failed to post /${method}: ${res.Description}`);
        }
        return res.Inner;
    }

    private async postDataMultipart<Type>(method: string, TypeNew: new(obj?: unknown) => Type, params: RequestParams): Promise<Type> {
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

        const resp = await fetch(url, {
            method: 'POST',
            body: Readable.from(encoder.encode()),
            headers: encoder.headers
        });
        if (!resp.ok && !resp.body) {
            throw new Error(`Failed to post /${method}: ${resp.status} ${resp.statusText}`);
        }
        const j = await resp.json();
        const res = new TelegramResponseWrapper(TypeNew, j);
        if (!res.Ok) {
            throw new Error(`Failed to multipart /${method}: ${res.Description}`);
        }
        return res.Inner;
    }
}

// should be moved to RequestFile.ts
function isReqFile(obj: unknown): obj is RequestFile {
    return obj['path'] && obj['mime'];
}

export default TelegramApi;
