import human from '../src/human';

describe('human converter tests', () => {
    it('Should convert time in seconds to human readable', () => {
        let res = human.time(10921);
        expect(res).toBe('03:02:01');
        res = human.time(3599);
        expect(res).toBe('59:59');
    });

    it('Should convert byte size to human readable', () => {
        let res = human.size(1337);
        expect(res).toBe('1.31 KB');
        res = human.size(999);
        expect(res).toBe('999 B');
        res = human.size(8800555);
        expect(res).toBe('8.39 MB');
    });

    it('Should convert date to human readable', () => {
        let res = human.date(new Date(2021, 6, 22));
        expect(res).toBe('2021-07-22');
        res = human.date(new Date(2021, 11, 1));
        expect(res).toBe('2021-12-01');
    });
});
