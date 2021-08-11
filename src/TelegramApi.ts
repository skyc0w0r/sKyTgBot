import fetch from 'node-fetch';
import RequestParams from './Model/Internal/RequestParams';
import UnknownJsonResponse from './Model/Internal/UnknownJsonResponse';
import Message from './Model/Telegram/Message';
import SetWebhookResponse from './Model/Telegram/SetWebhookResponse';
import Webhook from './Model/Telegram/Webhook';

const TG_BASE_API_ADDRESS = 'https://api.telegram.org/bot';

class TelegramApi {
    private token: string;
    constructor(botToken: string) {
        this.token = botToken;
    }

    public GetWebhookInfo(): Promise<Webhook> {
        return this.getData('getWebhookInfo', Webhook);
        // return this.getDataUnknown('getWebhookInfo').then(e => e as Webhook);
    }

    public SetWebHook(hookUrl: string): Promise<SetWebhookResponse> {
        return this.postData('setWebhook', SetWebhookResponse, { url: hookUrl});
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
        };
        return this.postData('sendMessage', Message, p);
    }


    private getDataUnknown(method: string, params?: RequestParams): Promise<unknown> {
        return this.getData(method, UnknownJsonResponse, params).then(e => e.data);
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
            return new TypeNew(j);
        });
    }

    private postDataUnknown(method: string, params?: RequestParams): Promise<unknown> {
        return this.postData(method, UnknownJsonResponse, params).then(e => e.data);
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
            return new TypeNew(j);
        });
    }
}

export default TelegramApi;
