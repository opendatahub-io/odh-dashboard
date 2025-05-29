import { GroupKind } from '#~/k8sTypes';

type MockGroupType = {
  name?: string;
};
export const mockGroup = ({ name = 'odh-admins' }: MockGroupType): GroupKind => ({
  metadata: {
    name,
  },
  users: [],
  apiVersion: 'user.openshift.io/v1',
  kind: 'Group',
});
