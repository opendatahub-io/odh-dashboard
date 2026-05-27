import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR';
import { NIMAccountModel } from '../../api/accounts/k8s';

type UseNIMSettingsAccessAllowedResult = {
  loaded: boolean;
  allowed: boolean | undefined;
};

export const useNIMSettingsAccessAllowed = (
  namespace: string,
): UseNIMSettingsAccessAllowedResult => {
  const [canCreateAccount, accountCreateLoaded] = useAccessAllowed({
    group: NIMAccountModel.apiGroup,
    resource: NIMAccountModel.plural,
    namespace,
    verb: 'create',
  });
  const [canDeleteAccount, accountDeleteLoaded] = useAccessAllowed({
    group: NIMAccountModel.apiGroup,
    resource: NIMAccountModel.plural,
    namespace,
    verb: 'delete',
  });
  const [canCreateSecret, secretCreateLoaded] = useAccessAllowed({
    resource: 'secrets',
    namespace,
    verb: 'create',
  });
  const [canUpdateSecret, secretUpdateLoaded] = useAccessAllowed({
    resource: 'secrets',
    namespace,
    verb: 'update',
  });
  const [canDeleteSecret, secretDeleteLoaded] = useAccessAllowed({
    resource: 'secrets',
    namespace,
    verb: 'delete',
  });
  const loaded =
    accountCreateLoaded &&
    accountDeleteLoaded &&
    secretCreateLoaded &&
    secretUpdateLoaded &&
    secretDeleteLoaded;
  const allowed = loaded
    ? canCreateAccount && canDeleteAccount && canCreateSecret && canUpdateSecret && canDeleteSecret
    : undefined;

  return { loaded, allowed };
};
