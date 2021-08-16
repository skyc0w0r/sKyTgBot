import { join } from 'path';
import cache from '../src/cache';
import config from '../src/config';
import MessageEntity from '../src/Model/Telegram/MessageEntity';
import TelegramApi from '../src/TelegramApi';

describe('telegram api test', () => {
    const myId = config.get().ADMIN_ID;
    const tg = new TelegramApi(config.get().TG_BOT_TOKEN);
    jest.setTimeout(60*1000*60);

    it('Should send photo from local file', async () => {
        const path = join(process.cwd(), './cache/test_data/image4.jpg');
        const mime = await cache.getMime(path);

        const msg = await tg.SendPhoto(myId, {path, mime}, 'Test photo with mime');
        expect(msg).toBeDefined();
        expect(msg.Photo).toBeDefined();
    });

    it('Command markup test', async () => {
        const msg = await tg.SendMessage(myId, '/yt_Abrn8aVQ76Q', null, [MessageEntity.create('bot_command', 0, 15)]);
        console.log(msg);
        expect(msg).toBeDefined();
    });
});
