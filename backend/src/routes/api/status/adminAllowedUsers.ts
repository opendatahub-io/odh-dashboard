import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { getUserInfo } from '../../../utils/userUtils';
import { isUserAdmin, KUBE_SAFE_PREFIX } from '../../../utils/adminUtils';
import { getNotebooks } from '../../../utils/notebookUtils';

type AllowedUser = {
  username: string;
  privilege: 'Admin' | 'User';
  lastActivity: string;
};

/**
 * Get list of users with active notebooks (Group API independent).
 * This works in both traditional OpenShift and BYO OIDC environments.
 *
 * @deprecated -- Jupyter Tile reliance; limited functionality in BYO OIDC
 */
export const getAllowedUsers = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{ Params: { namespace: string } }>,
): Promise<AllowedUser[]> => {
  const { namespace } = request.params;
  const userInfo = await getUserInfo(fastify, request);
  const currentUser = userInfo.userName;
  const isAdmin = await isUserAdmin(fastify, request);

  if (!isAdmin) {
    fastify.log.warn(`A request for all allowed users was made as a non Admin (by ${currentUser})`);
    return [];
  }

  // Get users from notebook resources only (no Group API required)
  const notebooks = await getNotebooks(fastify, namespace);

  const usersMap = new Map<string, AllowedUser>();

  for (const notebook of notebooks.items) {
    let username = notebook.metadata.annotations?.['opendatahub.io/username'];
    if (!username) {
      continue;
    }

    // Handle kube-safe prefix
    if (username.startsWith(KUBE_SAFE_PREFIX)) {
      const buffer = Buffer.from(username.slice(KUBE_SAFE_PREFIX.length), 'base64');
      username = String(buffer);
    }

    const lastActivity =
      notebook.metadata.annotations?.['notebooks.kubeflow.org/last-activity'] ||
      notebook.metadata.annotations?.['kubeflow-resource-stopped'] ||
      'Now';

    // In BYO OIDC, we can't determine admin status from Groups
    // Default to 'User' unless explicitly marked
    const isNotebookOwnerAdmin = notebook.metadata.labels?.['opendatahub.io/user-type'] === 'admin';

    const existing = usersMap.get(username);
    const privilege = existing?.privilege === 'Admin' || isNotebookOwnerAdmin ? 'Admin' : 'User';
    usersMap.set(username, {
      username,
      privilege,
      lastActivity,
    });
  }

  return Array.from(usersMap.values());
};
