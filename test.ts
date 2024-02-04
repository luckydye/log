import logger from './lib';

const log = logger().prefix('Test').trace();

log.info('Hello, world!');
