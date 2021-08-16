import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import { join } from 'path';
import AudioEntity from './Model/Internal/AudioEntity';

const DB_PATH_DEFAULT = 'database.json';

class DataBase {
    private db: JsonDB;
    private fileName: string;
    constructor(file?: string) {
        this.fileName = join(process.cwd(), file || DB_PATH_DEFAULT);
    }

    init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                this.db = new JsonDB(new Config(this.fileName, true, true));
                this.db.push('/audios', {}, false);
                this.db.push('/history', [], false);

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    set(id: string, audio: AudioEntity): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                this.db.push(`/audios/${id}`, audio);
                this.db.push('/history[]', id);
                resolve();
            } catch (e) {
                reject(e);   
            }
        });
    }

    get(id: string): Promise<AudioEntity> {
        return new Promise<AudioEntity>((resolve, reject) => {
            try {
                const res = this.db.getObject<AudioEntity>(`/audios/${id}`);
                resolve(res);
            } catch (e) {
                reject(e);
            }
        });
    }

    exists(id: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            try {
                const res = this.db.exists(`/audios/${id}`);
                resolve(res);
            } catch (e) {
                reject(e);
            }
        });
    }

    getCount(): Promise<number> {
        return new Promise((resolve, reject) => {
            try {
                const res = this.db.count('/history');
                resolve(res);
            } catch (e) {
                reject(e);
            }
        });
    }

    getLastN(n = 10): Promise<AudioCollection> {
        return new Promise<AudioCollection>((resolve, reject) => {
            try {    
                const count = this.db.count('/history');
                n = Math.min(count, n);

                const res: AudioCollection = {};
                for (let i = 0; i < n; i++) {
                    const id = this.db.getData(`/history[${count-1-i}]`);
                    const data = this.db.getObject<AudioEntity>(`/audios/${id}`);
                    res[id] = data;
                }
                
                resolve(res);
            } catch (e) {
                reject(e);
            }
        });
    }
};

interface AudioCollection {
    [key: string]: AudioEntity
}

export default DataBase;
