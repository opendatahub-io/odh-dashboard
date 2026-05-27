import { useAccessAllowed } from '#~/concepts/userSSAR';
import { TrustyAIApplicationsModel } from '#~/api/models/odh';

type UseTrustySettingsAccessAllowedResult = {
  loaded: boolean;
  allowed: boolean | undefined;
};

export const useTrustySettingsAccessAllowed = (
  namespace: string,
): UseTrustySettingsAccessAllowedResult => {
  const [canCreateCR, crCreateLoaded] = useAccessAllowed({
    group: TrustyAIApplicationsModel.apiGroup,
    resource: TrustyAIApplicationsModel.plural,
    namespace,
    verb: 'create',
  });
  const [canDeleteCR, crDeleteLoaded] = useAccessAllowed({
    group: TrustyAIApplicationsModel.apiGroup,
    resource: TrustyAIApplicationsModel.plural,
    namespace,
    verb: 'delete',
  });
  const [canCreateSecret, secretCreateLoaded] = useAccessAllowed({
    resource: 'secrets',
    namespace,
    verb: 'create',
  });
  const [canDeleteSecret, secretDeleteLoaded] = useAccessAllowed({
    resource: 'secrets',
    namespace,
    verb: 'delete',
  });
  const loaded = crCreateLoaded && crDeleteLoaded && secretCreateLoaded && secretDeleteLoaded;
  const allowed = loaded
    ? canCreateCR && canDeleteCR && canCreateSecret && canDeleteSecret
    : undefined;

  return { loaded, allowed };
};
