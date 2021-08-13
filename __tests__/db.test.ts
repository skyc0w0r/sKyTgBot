import { existsSync, unlinkSync } from 'fs';
import DataBase from '../src/DataBase';

describe('database test', () => {
    const dbPath = './database-test.json';
    const db = new DataBase(dbPath);

    it('Should create db file', async () => {
        await db.init();
        expect(existsSync(dbPath)).toBeTruthy();
    });

    it('Should add 2 audio objects to db', async () => {
        let count = await db.getCount();
        expect(count).toBe(0);

        await db.set('test_1', {
            channel: 'channel_1',
            duration: 123,
            fileId: 'foo?',
            size: 1337,
            thumbId: 'bar?',
            title: 'title_1'
        });
        await db.set('test_2', {
            channel: 'channel_2',
            duration: 456,
            fileId: 'foo?',
            size: 1488,
            thumbId: 'bar?',
            title: 'title_2'
        });

        count = await db.getCount();
        expect(count).toBe(2);
    });

    it('Should throw on non existing item', async () => {
        await expect(db.get('test_3')).rejects.toThrow();
    });

    it('Should get existing item', async () => {
        const data = await db.get('test_1');
        expect(data.title).toBe('title_1');
    });

    it('Should get last added item', async () => {
        const data = await db.getLastN(1);
        expect(data.length).toBe(1);
        expect(data[0].title).toBe('title_2');
    });

    it('Should cleanup test db file', () => {
        unlinkSync(dbPath);
        expect(existsSync(dbPath)).toBeFalsy();
    });
});
