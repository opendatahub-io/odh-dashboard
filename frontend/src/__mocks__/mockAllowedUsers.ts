import { AllowedUser, PrivilegeState } from '#~/pages/notebookController/screens/admin/types';

type MockAllowedUsersType = {
  username?: string;
  privilege?: PrivilegeState;
  lastActivity?: string;
};
export const mockAllowedUsers = ({
  username = 'test-user',
  privilege = PrivilegeState.USER,
  lastActivity = '2024-02-14T14:22:05Z',
}: MockAllowedUsersType): AllowedUser => ({
  username,
  privilege,
  lastActivity,
});
