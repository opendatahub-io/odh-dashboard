import * as fs from 'fs';
import { KubeFastifyInstance, OauthFastifyRequest } from '../types';
import { LOG_DIR } from './constants';
import { getUserName } from './userUtils';
import { getNamespaces } from './notebookUtils';
import { isUserAdmin } from './adminUtils';

export type AdminLogRecord = {
  user: string;
  namespace: string;
  action: string;
  endpoint: string;
  isAdmin: boolean;
  needsAdmin: boolean;
};

export const logRequestDetails = (
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  routeNeedsAdmin?: boolean,
): void => {
  const data: Omit<AdminLogRecord, 'user' | 'isAdmin'> = {
    namespace: fastify.kube.namespace,
    action: request.method.toUpperCase(),
    endpoint: request.url.replace(request.headers.origin, ''),
    needsAdmin: routeNeedsAdmin ?? false,
  };

  const writeLogAsync = async () => {
    const username = await getUserName(fastify, request);
    const { dashboardNamespace } = getNamespaces(fastify);
    const isAdmin = await isUserAdmin(fastify, username, dashboardNamespace);

    writeAdminLog(fastify, {
      ...data,
      user: username,
      isAdmin: isAdmin,
    });
  };
  // break the thread so the request is not held up logging / determing permissions of the user
  setTimeout(
    () => writeLogAsync().catch((e) => fastify.log.error(`Error writing log. ${e.message}`)),
    0,
  );
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
