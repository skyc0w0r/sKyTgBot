import Logger from 'log4js';
import { join } from 'path';
import sq3 from 'sqlite3';
import AudioEntity from './Model/Internal/AudioEntity.js';

const logger = Logger.getLogger('db');
const DB_PATH_DEFAULT = 'database.sqlite3';

class DataBase {
    private db: sq3.Database;
    private fileName: string;
    constructor(file?: string) {
        this.fileName = join(process.cwd(), file || DB_PATH_DEFAULT);
    }

    async init(): Promise<void> {
        await new Promise<void>((resolve, reject) => this.db = new sq3.Database(this.fileName, (err) => {
            if (err) reject(err);
            resolve();
        }));
        await new Promise<void>((resolve, reject) => this.db.run('CREATE TABLE IF NOT EXISTS `audios`\
            (`id` TEXT NOT NULL, \
            `thumbId` TEXT NOT NULL, \
            `fileId` TEXT NOT NULL, \
            `title` TEXT NOT NULL, \
            `channel` TEXT NOT NULL, \
            `duration` INTEGER NOT NULL, \
            `size` INTEGER NOT NULL, \
            `available` TEXT NOT NULL,\
            PRIMARY KEY(id)\
        );', [], (res: sq3.RunResult, err: Error) => {
            if (err) reject(err);
            logger.debug('CREATE TABLE audios:', res);
            resolve();
        }));
        await new Promise<void>((resolve, reject) => this.db.run('CREATE TABLE IF NOT EXISTS `history` \
            (`id` INTEGER PRIMARY KEY AUTOINCREMENT, \
            `videoId` TEXT NOT NULL\
        );', [], (res: sq3.RunResult, err: Error) => {
            if (err) reject(err);
            logger.debug('CREATE TABLE history', res);
            resolve();
        }));

        logger.info('Db ready to use');
    }

    async destroy(): Promise<void> {
        this.db.interrupt();
        await new Promise<void>((resolve, reject) => this.db.close((err) => {
            if (err) reject(err);
            resolve();
        }));
    }

    async set(id: string, audio: AudioEntity): Promise<void> {
        await new Promise<void>((resolve, reject) => this.db.run('INSERT INTO\
            `audios` (`id`, `thumbId`, `fileId`, `title`, `channel`, `duration`, `size`, `available`)\
            VALUES ($id, $thumbId, $fileId, $title, $channel, $duration, $size, $available)\
            ;', {
                $id: id,
                $thumbId: audio.thumbId,
                $fileId: audio.fileId,
                $title: audio.title,
                $channel: audio.channel,
                $duration: audio.duration,
                $size: audio.size,
                $available: audio.available,
            }, (res: sq3.RunResult, err: Error) => {
                if (err) reject(err);
                logger.debug('INSERT audios:', res);
                resolve();
            })
        );
        
        await new Promise<void>((resolve, reject) => this.db.run('INSERT INTO\
            `history` (videoId)\
            VALUES ($videoId)\
            ;', {
                $videoId: id,
            }, (res: sq3.RunResult, err: Error) => {
                if (err) reject(err);
                logger.debug('INSERT history', res);
                resolve();
            })
        );

        logger.info('Added new track to db; id:', id);
    }

    async get(id: string): Promise<AudioEntity> {
        const res = await new Promise<AudioEntity | undefined>(
            (resolve, reject) => this.db.get(
                'SELECT * FROM audios where id = $id',
                { $id: id },
                (err, row) => {
                    if (err) reject(err);
                    if (!row) {
                        resolve(undefined);
                        return;
                    }

                    resolve({
                        thumbId: row['thumbId'],
                        fileId: row['fileId'],
                        title: row['title'],
                        channel: row['channel'],
                        duration: row['duration'],
                        size: row['size'],
                        available: row['available'],
                    });
                }
            )
        );
        
        return res;
    }

    async getCount(): Promise<number> {
        const res = await new Promise<number>(
            (resolve, reject) => this.db.get(
                'SELECT COUNT(*) cnt FROM audios;',
                (err, row) => {
                    if (err) reject(err);
                    if (!row) reject(new Error('How?'));

                    resolve(row['cnt']);
                }
            )
        );

        return res;
    }

    async getLastN(n = 10): Promise<AudioCollection> {
        const res = await new Promise<AudioCollection | undefined>(
            (resolve, reject) => this.db.all(
                'SELECT a.* FROM history h INNER JOIN audios a ON h.videoId = a.id ORDER BY h.id DESC LIMIT $n;',
                { $n: n },
                (err, rows) => {
                    if (err) reject(err);
                    const res = {};

                    for (const row of rows) {
                        const id = row['id'] as string;
                        const audio: AudioEntity = {
                            thumbId: row['thumbId'],
                            fileId: row['fileId'],
                            title: row['title'],
                            channel: row['channel'],
                            duration: row['duration'],
                            size: row['size'],
                            available: row['available'],
                        };
                        res[id] = audio;
                    }

                    resolve(res);
                }
            )
        );
        
        return res;
    }
};

interface AudioCollection {
    [key: string]: AudioEntity
}

export default DataBase;
