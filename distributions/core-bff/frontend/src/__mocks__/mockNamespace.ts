import { Namespace } from 'mod-arch-core';

type MockNamespace = {
  name?: string;
};

export const mockNamespace = ({ name = 'opendatahub' }: MockNamespace): Namespace => ({
  name,
});
