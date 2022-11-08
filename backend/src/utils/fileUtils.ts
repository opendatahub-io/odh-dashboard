import * as fs from 'fs';
import { KubeFastifyInstance } from '../types';
import { LOG_DIR } from './constants';

export type AdminLogRecord = {
  user: string;
  namespace: string;
  action: string;
  endpoint: string;
  payload: string;
  isAdmin: boolean;
  needsAdmin: boolean;
};

export const writeAdminLog = (fastify: KubeFastifyInstance, data: AdminLogRecord): void => {
  try {
    fs.appendFile(
      `${LOG_DIR}/adminActivity.log`,
      `${new Date().toISOString()}: ${JSON.stringify(data)}\n`,
      function (err) {
        if (err) {
          fastify.log.error(`ERROR: Unable to write to admin log - ${err}`);
        }
      },
    );
  } catch (e) {
    fastify.log.error('Failed to log admin activity!');
  }
};
