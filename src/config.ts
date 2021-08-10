import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface Config {
    TG_BOT_TOKEN: string
    TG_HOOK_URL: string
}

const DefaultConfig: Config = {
    TG_BOT_TOKEN: '[change_me]',
    TG_HOOK_URL: 'https://bot.skycolor.space/tg'
}
const configPath = join(process.cwd(), 'config.json');
let CurrentConfig: Config | undefined = undefined; 

function checkConfig(): void {
    if (CurrentConfig) {
        return;
    }

    try {
        if (!existsSync(configPath)) {
            writeDefaultConfig();
            throw new Error('Fresh config, please replace [change_me] values');
        }

        const text = readFileSync(configPath, {'encoding': 'utf-8'});
        CurrentConfig = JSON.parse(text);
    }
    catch (e) {
        throw new Error(`Config check failed, inner message: ${e}`)        
    }
}

function getConfig(): Config {
    checkConfig();
    return CurrentConfig;
}

function writeDefaultConfig(): void {
    writeFileSync(configPath, JSON.stringify(DefaultConfig, null, 4))
}

export default {
    get: getConfig,
    check: checkConfig
}
