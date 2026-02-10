import app from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

function startServer() {
  try {
    const server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'api listening');
    });

    server.on('error', (error) => {
      logger.fatal({ err: error }, 'failed to start api server');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ err: error }, 'failed to bootstrap api server');
    process.exit(1);
  }
}

startServer();
