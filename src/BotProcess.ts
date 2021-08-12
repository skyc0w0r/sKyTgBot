import logger from './logger';
import Message from './Model/Telegram/Message';
import Update from './Model/Telegram/Update';
import TelegramApi from './TelegramApi';
import YouTubeApi from './YouTubeApi';

const ytreg = new RegExp('(https?://)?(www.)?(youtube\\.com/watch\\?v=|youtu\\.be/)(?<link>[^?&]+)');

class BotProcess {
    private tgApi: TelegramApi;
    private ytApi: YouTubeApi;

    constructor(telegramApi: TelegramApi, youtubeApi: YouTubeApi) {
        this.tgApi = telegramApi;
        this.ytApi = youtubeApi;
    }

    public async Dispatch(update: Update): Promise<void> {
        if (!update || !update.Message) {
            return;
        }
        const msg = update.Message;

        try {
            if (msg.Text && msg.Text.startsWith('/yt')) {
                const tokens = msg.Text.split(' ', 2);
                if (tokens.length !== 2) {
                    return await this.yt2audioHelp(msg);
                }
                const link = this.tryGetYTLink(tokens[1]);
                if (!link) {
                    return await this.yt2audioHelp(msg);
                }
                return await this.yt2audio(msg, link);
            }
            const link = this.tryGetYTLink(msg.Text);
            if (link) {
                return await this.yt2audio(msg, link);
            }

            // const name = update.Message.Chat.Type === 'private' ? update.Message.Chat.Username : update.Message.Chat.Title;
            // await this.tgApi.SendMessage(update.Message.Chat.Id, `Hello, ${name}, this is sample response`);
            // await this.tgApi.SendMessage(update.Message.Chat.Id, 'This is sample reply', update.Message.Id);
            await this.tgApi.SendMessage(update.Message.Chat.Id, '🤔');
        } catch (e) {
            logger.error('Failed to dispatch update', update, 'because of error', e);
        }
    }

    private tryGetYTLink(text: string): string | null {
        const ytregres = ytreg.exec(text);
        if (ytregres && ytregres.groups && ytregres.groups['link']) {
            return ytregres.groups['link'];
        }
        return null;
    }

    private async yt2audio(msg: Message, link: string): Promise<void> {
        const videoInfo = await this.ytApi.getVideoInfo(link);
        logger.debug('Got video info', videoInfo);
    }

    private async yt2audioHelp(msg: Message): Promise<void> {
        const text = 'Usage: /yt ( youtube.com/watch?v=<id> | youtu.be/<id> )';
        return await this.tgApi.SendMessage(msg.Chat.Id, text).then();
    }
    // https://youtu.be/n78Gg6_zEQg
    // https://www.youtube.com/watch?v=n78Gg6_zEQg
}

export default BotProcess;
