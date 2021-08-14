import { join } from 'path';
import cache from '../src/cache';
import config from '../src/config';
import TelegramApi from '../src/TelegramApi';

describe('telegram api test', () => {
    const myId = config.get().ADMIN_ID;
    const tg = new TelegramApi(config.get().TG_BOT_TOKEN);
    jest.setTimeout(60*1000*60);

    it('Should send photo from local file', async () => {
        const path = join(process.cwd(), './cache/test_data/image4.jpg');
        const mime = await cache.getMime(path);

        const msg = await tg.sendPhoto(myId, {path, mime}, 'Test photo with mime');
        expect(msg).toBeDefined();
        expect(msg.Photo).toBeDefined();
    });
});
