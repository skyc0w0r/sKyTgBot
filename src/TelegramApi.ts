import fetch from 'node-fetch';
import RequestParams from './Model/Internal/RequestParams';
import Webhook from './Model/Telegram/Webhook';

const TG_BASE_API_ADDRESS = 'https://api.telegram.org/bot';

class TelegramApi {
    private token: string;
    constructor(botToken: string) {
        this.token = botToken;
    }

    public GetWebhookInfo(): Promise<Webhook> {
        return this.getData('getWebhookInfo', Webhook);
    }

    public async SetWebHook(hookUrl: string): Promise<boolean> {
        const res = await this.postData('setWebhook', null, { url: hookUrl});
        console.log('Result: ', res);
        return true;
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
                'Content-Type': 'application/json',
            }
        }).then(resp => {
            if (!resp.ok) {
                throw new Error(`Failed to get /${method}: ${resp.status} ${resp.statusText}`);
            }
            return resp.json();
        }).then(j => {
            return new TypeNew(j)
        })
    }

    private postData<Type>(method: string, TypeNew: new(obj?: unknown) => Type | null, params?: RequestParams): Promise<Type | unknown> {
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
            if (TypeNew) {
                return new TypeNew(j)
            }
            return j;
        })
    }
}

export default TelegramApi;
