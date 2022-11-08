import * as fs from 'fs';
import * as path from 'path';
import { KubeFastifyInstance } from '../types';

export const writeAdminLog = (fastify: KubeFastifyInstance, data: object): void => {
  const normalizedPath = path.join(__dirname, '../../../logs/adminActivity.log');
  try {
    fs.appendFile(normalizedPath, `${JSON.stringify(data)}\n`, function (err) {
      if (err) {
        return new Error(err.message);
      }
    });
  } catch (e) {
    fastify.log.error('Failed to log admin activity!');
  }
};
