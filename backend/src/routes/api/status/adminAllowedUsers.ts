import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance } from '../../../types';
import { getUserInfo } from '../../../utils/userUtils';
import {
  getAdminUserList,
  getAllowedUserList,
  getClusterAdminUserList,
  isUserAdmin,
  KUBE_SAFE_PREFIX,
} from '../../../utils/adminUtils';
import { getNotebooks } from '../../../utils/notebookUtils';

type AllowedUser = {
  username: string;
  privilege: 'Admin' | 'User';
  lastActivity: string;
};
type AllowedUserMap = { [username: string]: AllowedUser };
type UserActivityMap = { [username: string]: string };

const convertUserListToMap = (
  userList: string[],
  privilege: 'Admin' | 'User',
  activityMap: UserActivityMap,
): AllowedUserMap =>
  userList.reduce<AllowedUserMap>((acc, rawUsername) => {
    let username = rawUsername;
    if (username.startsWith(KUBE_SAFE_PREFIX)) {
      // Users who start with this designation are non-k8s names
      username = username.slice(KUBE_SAFE_PREFIX.length);
    }

    return {
      ...acc,
      [username]: { username, privilege, lastActivity: activityMap[username] ?? null },
    };
  }, {});

const getUserActivityFromNotebook = async (
  fastify: KubeFastifyInstance,
  namespace: string,
): Promise<UserActivityMap> => {
  const notebooks = await getNotebooks(fastify, namespace);

  return notebooks.items
    .map<[string | undefined, string | undefined]>((notebook) => [
      notebook.metadata.annotations?.['opendatahub.io/username'],
      notebook.metadata.annotations?.['notebooks.kubeflow.org/last-activity'] ||
        notebook.metadata.annotations?.['kubeflow-resource-stopped'] ||
        'Now',
    ])
    .filter(
      (arr): arr is [string, string] =>
        Array.isArray(arr) && typeof arr[0] === 'string' && typeof arr[1] === 'string',
    )
    .reduce<UserActivityMap>(
      (acc, [username, lastActivity]) => ({
        ...acc,
        [username]: lastActivity,
      }),
      {},
    );
};

/** @deprecated -- Jupyter Tile reliance; group and user fetching is incompatible with OpenShift Console growth */
export const getAllowedUsers = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{ Params: { namespace: string } }>,
): Promise<AllowedUser[]> => {
  const { namespace } = request.params;
  const userInfo = await getUserInfo(fastify, request);
  const currentUser = userInfo.userName;
  const isAdmin = await isUserAdmin(fastify, request);
  if (!isAdmin) {
    // Privileged call -- return nothing
    fastify.log.warn(
      `A request for all allowed users & their status was made as a non Admin (by ${currentUser})`,
    );
    return [];
  }

  const activityMap = await getUserActivityFromNotebook(fastify, namespace);

  const withNotebookUsers = Object.keys(activityMap);
  // TODO: Move away from this group listing design...
  const adminUsers = await getAdminUserList(fastify);
  const allowedUsers = await getAllowedUserList(fastify);
  // get cluster admins that have a notebook
  const clusterAdminUsers = (await getClusterAdminUserList(fastify)).filter((user) =>
    withNotebookUsers.includes(user),
  );

  const usersWithNotebooksMap: AllowedUserMap = convertUserListToMap(
    withNotebookUsers,
    'User',
    activityMap,
  );
  const allowedUsersMap: AllowedUserMap = convertUserListToMap(allowedUsers, 'User', activityMap);
  const adminUsersMap: AllowedUserMap = convertUserListToMap(adminUsers, 'Admin', activityMap);
  const clusterAdminUsersMap: AllowedUserMap = convertUserListToMap(
    clusterAdminUsers,
    'Admin',
    activityMap,
  );

  const returnUsers: AllowedUserMap = {
    ...usersWithNotebooksMap,
    ...allowedUsersMap,
    ...adminUsersMap,
    ...clusterAdminUsersMap,
  };
  return Object.values(returnUsers);
};
