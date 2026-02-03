import dotenv from 'dotenv';
import pino from 'pino';

import app from './app.js';

dotenv.config();

const logLevel = process.env.LOG_LEVEL;
const port = Number(process.env.PORT);

if (!logLevel) {
  throw new Error('LOG_LEVEL is required');
}

if (!Number.isFinite(port) || port <= 0) {
  throw new Error('PORT is required and must be a valid number');
}

const logger = pino({ level: logLevel });

app.listen(port, () => {
  logger.info({ port }, 'api listening on port ' + port);
});
