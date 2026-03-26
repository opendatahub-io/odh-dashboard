import { getInstance, init, registerRemotes } from '@module-federation/runtime';

const MLFLOW_EMBEDDED_ENTRY = '/_mf/mlflowEmbedded/mlflow/static-files/federated/remoteEntry.js';

export const registerMlflowEmbeddedRemote = (): void => {
  const remote = {
    name: 'mlflowEmbedded',
    entry: MLFLOW_EMBEDDED_ENTRY,
  };

  if (getInstance()) {
    registerRemotes([remote], { force: true });
    return;
  }

  init({
    name: 'evalHub',
    remotes: [remote],
  });
};
