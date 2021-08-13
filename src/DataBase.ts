import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import { join } from 'path';

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
                this.db.push('/audios', {});
                this.db.push('/history', []);

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    set(id: string, audio: AudioObject): Promise<void> {
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

    get(id: string): Promise<AudioObject> {
        return new Promise<AudioObject>((resolve, reject) => {
            try {
                const res = this.db.getObject<AudioObject>(`/audios/${id}`);
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

    getLastN(n = 10): Promise<Array<AudioObject>> {
        return new Promise<Array<AudioObject>>((resolve, reject) => {
            try {    
                const count = this.db.count('/history');
                n = Math.min(count, n);

                const res = new Array<AudioObject>();
                for (let i = 0; i < n; i++) {
                    const id = this.db.getData(`/history[${-1-i}]`);
                    const data = this.db.getObject<AudioObject>(`/audios/${id}`);
                    res.push(data);
                }
                
                resolve(res);
            } catch (e) {
                reject(e);
            }
        });
    }
};

interface AudioObject {
    thumbId: string
    fileId: string
    title: string
    channel: string
    duration: number
    size: number
}

export default DataBase;
