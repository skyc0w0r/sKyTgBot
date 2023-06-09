import express from 'express';
import { URL } from 'url';
import Logger from 'log4js';
import BotProcess from './BotProcess.js';
import config from './config.js';
import DataBase from './DataBase.js';
import Update from './Model/Telegram/Update.js';
import TelegramApi from './TelegramApi.js';
import YouTubeApi from './YouTubeApi.js';
import { readFileSync } from 'fs';
import AudioEntity from './Model/Internal/AudioEntity.js';

async function main(): Promise<void> {
    config.check();
    Logger.configure(config.get().LOG_CONFIG);
    const logger = Logger.getLogger('main');

    const tgapi = new TelegramApi(config.get().TG_BOT_TOKEN);
    const ytapi = new YouTubeApi(config.get().YT_DATA_TOKEN);
    const db = new DataBase();
    await db.init();
    const app = express();
    const bot = new BotProcess(tgapi, ytapi, db);
    
    // migrate old db to new
    if (process.env['MIGRATE_DB']) {
        const oldDbPath = process.env['MIGRATE_DB'];
        const oldDb = JSON.parse(readFileSync(oldDbPath).toString());
        for (const videoId of oldDb['history']) {
            const audio = oldDb['audios'][videoId] as AudioEntity;
            if (!audio.available) audio.available = 'yes';
            await db.set(videoId, audio);
        }
        const cnt = await db.getCount();
        await db.destroy();
        logger.info('Migration complete! Transfer count:', cnt);
        return;
    }

    // check hook
    if (!process.env['BOT_NO_HOOK']) {
        const info = await tgapi.GetWebhookInfo();
        logger.debug('Hook info:', info);
        if (info.Url !== config.get().TG_HOOK_URL) {
            const setwh = await tgapi.SetWebHook(config.get().TG_HOOK_URL);
            logger.debug('Set webhook response:', setwh);
        }    
    }
    
    // create listen server
    app.use(express.json());
    const u = new URL(config.get().TG_HOOK_URL);
    app.post(u.pathname, (req, res) => {
        res.status(200);
        res.send('ok');
        logger.debug('Update from tg:', req.body);
        bot.Dispatch(new Update(req.body));
    });
    const sv = app.listen(config.get().LISTEN_PORT, () => {
        logger.info(`Express listening on port ${config.get().LISTEN_PORT}`);
    });
    
    // proper shutdown on Ctrl+C and kill
    const onProcessSignal = async (signal: NodeJS.Signals) => {
        logger.info('Got signal', signal);
        await new Promise<void>((r, e) => sv.close((err) => {
            if (err) {
                e(err);
            }
            r();
        })).catch(e => {
            logger.error('Failed to shutdown server (how?)', e);
        });
        await db.destroy();
        logger.info('Bye...');
    };
    process.on('SIGTERM', onProcessSignal);
    process.on('SIGINT', onProcessSignal);
}

main().catch(e => console.error('Fatal error:', e));
