import cache from './cache';
import DataBase from './DataBase';
import FFmpegWrapper from './FFmpegWrapper';
import human from './human';
import logger from './logger';
import TrackMetadata from './Model/Internal/TrackMetadata';
import Message from './Model/Telegram/Message';
import Update from './Model/Telegram/Update';
import net from './net';
import TelegramApi from './TelegramApi';
import YouTubeApi from './YouTubeApi';

const ytreg = new RegExp('(https?://)?(www.)?(youtube\\.com/watch\\?v=|youtu\\.be/)(?<link>[^?&]+)');

class BotProcess {
    private tgApi: TelegramApi;
    private ytApi: YouTubeApi;
    private db: DataBase;

    constructor(telegramApi: TelegramApi, youtubeApi: YouTubeApi, database: DataBase) {
        this.tgApi = telegramApi;
        this.ytApi = youtubeApi;
        this.db = database;
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
        if (!videoInfo) {
            return await this.tgApi.SendMessage(msg.Chat.Id, 'Invalid video id or failed to get video information').then();
        }
        const thumbnail = videoInfo.Snippet.bestThumbnail;
        if (!thumbnail) {
            logger.error('Video has no thumbnail (how?)', link);
            return;
        }
        const thumbLocalPath = await net.loadFile(thumbnail.Url);
        const thumbMime = await cache.getMime(thumbLocalPath);
        const caption = `Title: ${videoInfo.Snippet.Title}\n`
            + `Channel: ${videoInfo.Snippet.ChannelTitle}\n`
            + `Duration: ${human.time(videoInfo.ContentDetails.Duration)}`;
        const photoMessage = await this.tgApi.sendPhoto(msg.Chat.Id, {path: thumbLocalPath, mime: thumbMime}, caption);

        logger.debug('Thumbnail sent, message:', photoMessage);

        const sourceStream = this.ytApi.getAudioStream(link);
        const audioLocalPath = cache.getTempFileName('m4a');
        await FFmpegWrapper.convertStreamAAC(sourceStream, audioLocalPath);
        const meta: TrackMetadata = {
            artist: videoInfo.Snippet.ChannelTitle,
            title: videoInfo.Snippet.Title,
            date: human.date(videoInfo.Snippet.PublishedAt),
            composer: link,
            coverPath: thumbLocalPath,
            genre: 'Music',
        };
        await FFmpegWrapper.addMetadata(audioLocalPath, meta);
        const audioMime = await cache.getMime(audioLocalPath);
        const audioMessage = await this.tgApi.sendAudio(msg.Chat.Id, { path: audioLocalPath, mime: audioMime }, '');

        logger.debug('Audio sent, message:', audioMessage);

        await this.db.set(link, {
            title: videoInfo.Snippet.Title,
            channel: videoInfo.Snippet.ChannelTitle,
            duration: videoInfo.ContentDetails.Duration,
            size: audioMessage.Audio.FileSize || 0,
            thumbId: photoMessage.Photo[0].Id,
            fileId: audioMessage.Audio.Id
        });
    }

    private async yt2audioHelp(msg: Message): Promise<void> {
        const text = 'Usage: /yt ( youtube.com/watch?v=<id> | youtu.be/<id> )';
        return await this.tgApi.SendMessage(msg.Chat.Id, text).then();
    }
    // https://youtu.be/n78Gg6_zEQg
    // https://www.youtube.com/watch?v=n78Gg6_zEQg
}

export default BotProcess;
