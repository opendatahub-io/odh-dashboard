import { Namespace } from 'mod-arch-core';

type MockNamespace = {
  name?: string;
  displayName?: string;
};

export const mockNamespace = ({ name = 'kubeflow', displayName }: MockNamespace): Namespace => ({
  name,
  displayName: displayName ?? name,
});
