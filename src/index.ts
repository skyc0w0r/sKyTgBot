import config from './config';
import TelegramApi from './TelegramApi';

async function main(): Promise<void> {
    config.check();

    const tgapi = new TelegramApi(config.get().TG_BOT_TOKEN);
    const info = await tgapi.GetWebhookInfo();
    if (info.Url !== config.get().TG_HOOK_URL) {
        tgapi.SetWebHook(config.get().TG_HOOK_URL);
    }

    await new Promise<void>(r => setTimeout(() => r(), 10000));
}

main().catch(e => console.error('Fatal error:', e));