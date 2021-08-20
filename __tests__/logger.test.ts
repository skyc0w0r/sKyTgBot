import { readdirSync } from 'fs';
import logger from '../src/logger';

describe('logger test', () => {
    it('Should create log file, and log all level', () => {
        logger.info('foo', 42, true);
        logger.debug('Object example', {foo: 42});
        logger.error('Array example', [1,2,3,4]);

        expect(readdirSync('.').some(c => c.endsWith('.log'))).toBeTruthy();
    });
});
