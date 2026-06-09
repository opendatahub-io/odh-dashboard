import { getInstance, init, registerRemotes } from '@module-federation/runtime';

const GEN_AI_ENTRY = '/_mf/genAi/remoteEntry.js';

export const registerGenAiRemote = (): void => {
  const remote = {
    name: 'genAi',
    entry: GEN_AI_ENTRY,
  };

  if (getInstance()) {
    registerRemotes([remote], { force: true });
    return;
  }

  init({
    name: 'autorag',
    remotes: [remote],
  });
};
