import { existsSync, unlinkSync } from 'fs';
import DataBase from '../src/DataBase';

describe('database test', () => {
    const dbPath = './database-test.sqlite3';
    const db = new DataBase(dbPath);
    jest.setTimeout(60*1000*60);

    beforeAll(async () => {
        await db.init();

        await db.set('test_1', {
            channel: 'channel_1',
            duration: 123,
            fileId: 'foo?',
            size: 1337,
            thumbId: 'bar?',
            title: 'title_1',
            available: 'yes',
        });
        await db.set('test_2', {
            channel: 'channel_2',
            duration: 456,
            fileId: 'foo?',
            size: 1488,
            thumbId: 'bar?',
            title: 'title_2',
            available: 'yes',
        });
    });

    afterAll(async () => {
        await db.destroy();
        unlinkSync(dbPath);
    });

    it('Should create db file', async () => {
        await db.init();
        expect(existsSync(dbPath)).toBeTruthy();
    });

    it('Should contain 2 audio objects in db', async () => {
        const count = await db.getCount();
        expect(count).toBe(2);
    });

    it('Should check if item exists', async () => {
        let res = await db.get('test_1');
        expect(res).toBeTruthy();

        res = await db.get('test_3');
        expect(res).toBeFalsy();
    });

    it('Should get existing item', async () => {
        const data = await db.get('test_1');
        expect(data.title).toBe('title_1');
    });

    it('Should get last added item', async () => {
        const data = await db.getLastN(1);
        expect(Object.keys(data).length).toBe(1);
        expect(data[Object.keys(data)[0]].title).toBe('title_2');
    });
});
