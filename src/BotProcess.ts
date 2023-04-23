import Logger from 'log4js';
import cache from './cache.js';
import DataBase from './DataBase.js';
import FFmpegWrapper from './FFmpegWrapper.js';
import human from './human.js';
import AudioEntity from './Model/Internal/AudioEntity.js';
import RequestFile from './Model/Internal/RequestFile.js';
import TrackMetadata from './Model/Internal/TrackMetadata.js';
import Message from './Model/Telegram/Message.js';
import Update from './Model/Telegram/Update.js';
import net from './net.js';
import TelegramApi from './TelegramApi.js';
import YouTubeApi from './YouTubeApi.js';

const logger = Logger.getLogger('bot');
const ytreg = new RegExp('(https?://)?(www.)?(youtube\\.com/watch\\?v=|youtu\\.be/)(?<link>[^?&]+)');
const err400reg = new RegExp('[ \\n]4\\d\\d[ \\n]');

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
            if (msg.Text && msg.Text === '/start') {
                await this.startMsg(msg);
                return;
            }
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

    private async startMsg(msg: Message): Promise<void> {
        await this.tgApi.SendMessage(msg.Chat.Id, _em('Greetings, skybot here.\n'
            + 'Bot is in development.\n'
            + 'Currently it can:\n'
            + '\t/yt load videos from YouTube as audio\n'
            + '\t/last Show last 10 loaded songs'));
    }

    private tryGetYTLink(text: string): string | null {
        const ytregres = ytreg.exec(text);
        if (ytregres && ytregres.groups && ytregres.groups['link']) {
            return ytregres.groups['link'];
        }
        return null;
    }

    private async yt2audio(msg: Message, videoId: string): Promise<void> {
        try {
            if (this.inProgress[msg.Chat.Id]) {
                await this.tgApi.SendMessage(msg.Chat.Id, 'Already processing this video for you, please wait', this.inProgress[msg.Chat.Id]);
                return;
            }
            this.inProgress[msg.Chat.Id] = msg.Id;
            const audio = await this.db.get(videoId);
            if (audio) {
                if (audio.available === 'yes') await this.yt2audioCache(msg, audio);
                else await this.tgApi.SendMessage(msg.Chat.Id, 'Video is unavailable in my country or age restricted 😥');
            } else {
                await this.yt2audioNew(msg, videoId);
            }
        } catch (e) {
            this.inProgress[msg.Chat.Id] = 0;
            throw e;
        }
        this.inProgress[msg.Chat.Id] = 0;
    }

    private async yt2audioNew(msg: Message, videoId: string): Promise<void> {
        const audioEntity: Partial<AudioEntity> = {};

        const videoInfo = await this.ytApi.getVideoInfo(videoId);
        if (!videoInfo) {
            await this.tgApi.SendMessage(msg.Chat.Id, 'Invalid video id or failed to get video information').then();
            return;
        }

        audioEntity.title = videoInfo.Snippet.Title;
        audioEntity.channel = videoInfo.Snippet.ChannelTitle;
        audioEntity.duration = videoInfo.ContentDetails.Duration;

        const thumbnailLarge = videoInfo.Snippet.bestThumbnail;
        if (!thumbnailLarge) {
            logger.error('Video has no thumbnail (how?)', videoId);
            await this.tgApi.SendMessage(msg.Chat.Id, 'Failed to get video info, try again later 😔');
            return;
        }

        // magic number calculated based on some videos
        // cat database.json | jq '.audios[] | .size / .duration' | jq -s '.' | jq 'add / length'
        const estimatedSize = videoInfo.ContentDetails.Duration * 20634;
        if (estimatedSize > 50 * 1024 * 1024) {
            await this.tgApi.SendMessage(msg.Chat.Id, 'Video is too long to be uploaded to telegeram');
            return;
        }
        audioEntity.size = estimatedSize;
        const thumbLocalPath = await net.loadFile(thumbnailLarge.Url);
        const thumbMime = await cache.getMime(thumbLocalPath);
        
        const photoMessage = await this.sendThumb(msg, audioEntity as AudioEntity, true, {path: thumbLocalPath, mime: thumbMime});
        audioEntity.thumbId = photoMessage.Photo[0].Id;

        await this.tgApi.SendChatAction(msg.Chat.Id, 'upload_document');

        const sourceStream = this.ytApi.getAudioStream(videoId);
        const audioLocalPath = cache.getTempFileName('m4a');
        try {
            await FFmpegWrapper.convertStreamAAC(sourceStream, audioLocalPath);
        } catch (ex) {
            if (ex instanceof Error) {
                if (err400reg.test(ex.message)) {
                    audioEntity.available = 'no';

                    await this.tgApi.SendMessage(msg.Chat.Id, 'Video is unavailable in my country or age restricted 😥');
                    await this.db.set(videoId, audioEntity as AudioEntity);

                    cache.removeFromCache(thumbLocalPath);
                    return;
                }
            }
            logger.warn('!!! Failed to get video, but unknown reason', ex);
            audioEntity.available = 'probably';

            await this.tgApi.SendMessage(msg.Chat.Id, 'Failed to get video 😥');
            await this.db.set(videoId, audioEntity as AudioEntity);

            return;
        }

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
            composer: videoId,
            coverPath: thumbLocalPath,
            genre: 'Music',
        };
        await FFmpegWrapper.addMetadata(audioLocalPath, meta);
        const audioMime = await cache.getMime(audioLocalPath);

        const audioMessage = await this.sendAudio(msg, audioEntity as AudioEntity, { path: audioLocalPath, mime: audioMime }, { path: thumbSmallLocal, mime: thumbSmallMime });
        cache.removeFromCache(thumbLocalPath);
        cache.removeFromCache(thumbSmallLocal);
        cache.removeFromCache(audioLocalPath);
        
        audioEntity.size = audioMessage.Audio.FileSize;
        audioEntity.fileId = audioMessage.Audio.Id;
        audioEntity.available = 'yes';

        await this.db.set(videoId, audioEntity as AudioEntity);
    }

    private async yt2audioCache(msg: Message, audio: AudioEntity): Promise<void> {
        await this.sendThumb(msg, audio, true);
        await this.sendAudio(msg, audio);
    }


    private async sendThumb(msg: Message, a: AudioEntity, estimnated = false, upload: RequestFile = null): Promise<Message> {
        const caption = `🎵 *${_em(a.title)}*\n`
            + `👤 *${_em(a.channel)}*\n`
            + `🕒 *${_em(human.time(a.duration))}*\n`
            + `💾 ${estimnated ? '\\~' : ''}*${_em(human.size(a.size))}*`;
        let photoMessage: Message;
        if (upload) {
            photoMessage = await this.tgApi.SendPhoto(msg.Chat.Id, upload, caption);
        } else {
            photoMessage = await this.tgApi.SendPhoto(msg.Chat.Id, a.thumbId, caption);
        }

        logger.debug('Thumbnail sent:', photoMessage);

        return photoMessage;
    }

    private async sendAudio(msg: Message, a: AudioEntity, upload: RequestFile = null, thumb: RequestFile = null): Promise<Message> {
        let audioMessage: Message;
        if (upload) {
            audioMessage = await this.tgApi.SendAudio(
                msg.Chat.Id,
                upload,
                '',
                a.duration,
                a.channel,
                a.title,
                thumb,
            );
        } else {
            audioMessage = await this.tgApi.SendAudio(
                msg.Chat.Id,
                a.fileId,
                '',
                a.duration,
                a.channel,
                a.title,
            );
        }

        logger.debug('Audio sent, message:', audioMessage);

        return audioMessage;
    }


    private async yt2audioHelp(msg: Message): Promise<void> {
        const text = 'Usage: /yt <link to youtube>\nOr just send me link using bot live @vid';
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
