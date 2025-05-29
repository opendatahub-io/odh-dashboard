import React from 'react';
import useTrustyAINamespaceCR from '#~/concepts/trustyai/useTrustyAINamespaceCR';
import {
  assembleSecret,
  createSecret,
  createTrustyAICR,
  deleteSecret,
  deleteTrustyAICR,
} from '#~/api';
import { getTrustyStatusState } from '#~/concepts/trustyai/utils';
import { TRUSTYAI_SECRET_NAME } from '#~/concepts/trustyai/const';
import useTrustyBrowserStorage from '#~/concepts/trustyai/content/useTrustyBrowserStorage';
import { TrustyDBData, TrustyStatusStates } from './types';

export type UseManageTrustyAICRReturnType = {
  statusState: TrustyStatusStates;
  installCRForNewDB: (secretData: TrustyDBData) => Promise<void>;
  installCRForExistingDB: (secretName: string) => Promise<void>;
  deleteCR: () => Promise<void>;
};

const useManageTrustyAICR = (namespace: string): UseManageTrustyAICRReturnType => {
  const state = useTrustyAINamespaceCR(namespace);
  const [cr, , , refresh] = state;
  const successDetails = useTrustyBrowserStorage(cr);

  const statusState = getTrustyStatusState(state, successDetails);

  const installCRForExistingDB = React.useCallback<
    UseManageTrustyAICRReturnType['installCRForExistingDB']
  >(
    async (secretName) => {
      await createTrustyAICR(namespace, secretName).then(refresh);
    },
    [namespace, refresh],
  );
  const installCRForNewDB = React.useCallback<UseManageTrustyAICRReturnType['installCRForNewDB']>(
    async (data) => {
      const submitNewSecret = async (dryRun: boolean) => {
        await Promise.all([
          createSecret(assembleSecret(namespace, data, 'generic', TRUSTYAI_SECRET_NAME), {
            dryRun,
          }),
          createTrustyAICR(namespace, TRUSTYAI_SECRET_NAME, { dryRun }),
        ]);
      };

      await submitNewSecret(true);
      await submitNewSecret(false);
      await refresh();
    },
    [namespace, refresh],
  );

  const deleteCR = React.useCallback<UseManageTrustyAICRReturnType['deleteCR']>(async () => {
    let deleteGeneratedSecret = false;
    if (cr?.spec.storage.format === 'DATABASE') {
      if (cr.spec.storage.databaseConfigurations === TRUSTYAI_SECRET_NAME) {
        deleteGeneratedSecret = true;
      }
    }

    await deleteTrustyAICR(namespace);
    if (deleteGeneratedSecret) {
      await deleteSecret(namespace, TRUSTYAI_SECRET_NAME);
    }
    await refresh();
  }, [cr, namespace, refresh]);

  return {
    statusState,
    installCRForExistingDB,
    installCRForNewDB,
    deleteCR,
  };
};

export default useManageTrustyAICR;
