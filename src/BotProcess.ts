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
    private inProgress: { [key: number]: number };

    constructor(telegramApi: TelegramApi, youtubeApi: YouTubeApi, database: DataBase) {
        this.tgApi = telegramApi;
        this.ytApi = youtubeApi;
        this.db = database;
        this.inProgress = {};
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
                    await this.yt2audioHelp(msg);
                    return;
                }
                const link = this.tryGetYTLink(tokens[1]);
                if (!link) {
                    await this.yt2audioHelp(msg);
                    return;
                }
                return await this.yt2audio(msg, link);
            }
            if (msg.Text && msg.Text === '/last') {
                await this.yt2audioLast(msg);
                return;
            }
            if (msg.Text && msg.Text.startsWith('/dl_')) {
                await this.yt2audio(msg, msg.Text.substr(4));
                return;
            }
            const link = this.tryGetYTLink(msg.Text);
            if (link) {
                await this.yt2audio(msg, link);
                return;
            }

            // const name = update.Message.Chat.Type === 'private' ? update.Message.Chat.Username : update.Message.Chat.Title;
            // await this.tgApi.SendMessage(update.Message.Chat.Id, `Hello, ${name}, this is sample response`);
            // await this.tgApi.SendMessage(update.Message.Chat.Id, 'This is sample reply', update.Message.Id);
            
            await this.tgApi.SendMessage(update.Message.Chat.Id, '🤔');
        } catch (e) {
            await this.tgApi.SendMessage(update.Message.Chat.Id, 'Sorry, something went wrong, try again later 😔', update.Message.Id);
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
        try {
            if (this.inProgress[msg.Chat.Id]) {
                await this.tgApi.SendMessage(msg.Chat.Id, 'Already processing this video for you, please wait', this.inProgress[msg.Chat.Id]);
                return;
            }
            this.inProgress[msg.Chat.Id] = msg.Id;
            if (await this.db.exists(link)) {
                await this.yt2audioCache(msg, link);
            } else {
                await this.yt2audioNew(msg, link);
            }
        } catch (e) {
            this.inProgress[msg.Chat.Id] = 0;
            throw e;
        }
        this.inProgress[msg.Chat.Id] = 0;
    }

    private async yt2audioNew(msg: Message, link: string): Promise<void> {
        const videoInfo = await this.ytApi.getVideoInfo(link);
        if (!videoInfo) {
            return await this.tgApi.SendMessage(msg.Chat.Id, 'Invalid video id or failed to get video information').then();
        }
        const thumbnailLarge = videoInfo.Snippet.bestThumbnail;
        if (!thumbnailLarge) {
            logger.error('Video has no thumbnail (how?)', link);
            return;
        }
        const thumbLocalPath = await net.loadFile(thumbnailLarge.Url);
        const thumbMime = await cache.getMime(thumbLocalPath);
        const caption = `🎵 *${_em(videoInfo.Snippet.Title)}*\n`
            + `👤 *${_em(videoInfo.Snippet.ChannelTitle)}*\n`
            + `🕒 *${_em(human.time(videoInfo.ContentDetails.Duration))}*`;
        const photoMessage = await this.tgApi.SendPhoto(msg.Chat.Id, {path: thumbLocalPath, mime: thumbMime}, caption);

        logger.debug('Thumbnail sent:', photoMessage);
        await this.tgApi.SendChatAction(msg.Chat.Id, 'upload_document');

        const sourceStream = this.ytApi.getAudioStream(link);
        const audioLocalPath = cache.getTempFileName('m4a');
        await FFmpegWrapper.convertStreamAAC(sourceStream, audioLocalPath);

        const thumbSmall = videoInfo.Snippet.limitedThumbnail(320);
        let thumbSmallLocal = '';
        let thumbSmallMime = '';
        if (thumbSmall) {
            thumbSmallLocal = await net.loadFile(thumbSmall.Url);
            thumbSmallMime = await cache.getMime(thumbSmallLocal);
        }
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
        const audioMessage = await this.tgApi.SendAudio(
            msg.Chat.Id,
            { path: audioLocalPath, mime: audioMime },
            '',
            videoInfo.ContentDetails.Duration,
            meta.artist,
            meta.title,
            thumbSmallMime ? { path: thumbSmallLocal, mime: thumbSmallMime } : null
        );

        logger.debug('Audio sent, message:', audioMessage);

        await this.db.set(link, {
            title: videoInfo.Snippet.Title,
            channel: videoInfo.Snippet.ChannelTitle,
            duration: videoInfo.ContentDetails.Duration,
            size: audioMessage.Audio.FileSize || 0,
            thumbId: photoMessage.Photo[0].Id,
            fileId: audioMessage.Audio.Id
        });

        cache.removeFromCache(thumbLocalPath);
        cache.removeFromCache(thumbSmallLocal);
        cache.removeFromCache(audioLocalPath);
    }

    private async yt2audioCache(msg: Message, link: string): Promise<void> {
        const a = await this.db.get(link);
        
        const caption = `🎵 *${_em(a.title)}*\n`
            + `👤 *${_em(a.channel)}*\n`
            + `🕒 *${_em(human.time(a.duration))}*`;
        const photoMessage = await this.tgApi.SendPhoto(msg.Chat.Id, a.thumbId, caption);

        logger.debug('Thumbnail sent:', photoMessage);

        const audioMessage = await this.tgApi.SendAudio(
            msg.Chat.Id,
            a.fileId,
            '',
            a.duration,
            a.channel,
            a.title,
        );

        logger.debug('Audio sent, message:', audioMessage);
    }

    private async yt2audioHelp(msg: Message): Promise<void> {
        const text = 'Usage: /yt ( youtube.com/watch?v=<id> | youtu.be/<id> )';
        return await this.tgApi.SendMessage(msg.Chat.Id, _em(text)).then();
    }

    private async yt2audioLast(msg: Message): Promise<void> {
        const audios = await this.db.getLastN();
        if (Object.keys(audios).length === 0) {
            await this.tgApi.SendMessage(msg.Chat.Id, _em('No audios have been downloaded yet'));
            return;
        }

        let text = `*${Object.keys(audios).length}* last loaded audios:`;
        let index = 1;
        for (const id in audios) {
            const a = audios[id];
            text += `\n${index}\\. [${_em(a.title)}](https://youtu.be/${id}) *${_em(human.time(a.duration))}* by ${_em(a.channel)}\n    Get this track \\/dl\\_${_em(id)}`;
            index += 1;
        }
        await this.tgApi.SendMessage(msg.Chat.Id, text);
    }
    // https://youtu.be/n78Gg6_zEQg
    // https://www.youtube.com/watch?v=n78Gg6_zEQg
}

const badChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
// this called this way for ease of use
/**
 * Escape telegram markup
 * @param s 
 * @returns 
 */
function _em(s: string): string {
    for (const e of badChars) {
        s = s.replaceAll(e, '\\' + e);
    }
    return s;
}

export default BotProcess;
