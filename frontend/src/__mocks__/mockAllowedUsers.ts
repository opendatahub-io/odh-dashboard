import { AllowedUser, PrivilegeState } from '~/pages/notebookController/screens/admin/types';

type MockAllowedUsersType = {
  username?: string;
  privilege?: PrivilegeState;
};
export const mockAllowedUsers = ({
  username = 'test-user',
  privilege = PrivilegeState.USER,
}: MockAllowedUsersType): AllowedUser => ({
  username,
  privilege,
  lastActivity: '2024-02-14T14:22:05Z',
});
