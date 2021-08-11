import express from 'express';
import { URL } from 'url';
import BotProcess from './BotProcess';
import config from './config';
import logger from './logger';
import Update from './Model/Telegram/Update';
import TelegramApi from './TelegramApi';
import YouTubeApi from './YouTubeApi';

async function main(): Promise<void> {
    config.check();

    const tgapi = new TelegramApi(config.get().TG_BOT_TOKEN);
    const ytapi = new YouTubeApi(config.get().YT_DATA_TOKEN);
    const app = express();
    const bot = new BotProcess(tgapi, ytapi);
    
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
    
    // proper shutdown on Ctrl+C
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
        logger.info('Bye...');
    };
    process.on('SIGTERM', onProcessSignal);
    process.on('SIGINT', onProcessSignal);
}

main().catch(e => console.error('Fatal error:', e));