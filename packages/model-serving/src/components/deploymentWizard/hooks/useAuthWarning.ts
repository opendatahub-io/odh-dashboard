import { TokenAuthenticationFieldData } from '../fields/TokenAuthenticationField';

type UseAuthWarningProps = {
  shouldAutoCheckTokens: boolean;
  isExternalRouteVisible: boolean;
  externalRouteData?: boolean;
  tokenAuthData?: TokenAuthenticationFieldData;
};

export const useAuthWarning = ({
  shouldAutoCheckTokens,
  isExternalRouteVisible,
  externalRouteData,
  tokenAuthData,
}: UseAuthWarningProps): boolean => {
  const hasNoTokens = !tokenAuthData || tokenAuthData.length === 0;
  return (
    (shouldAutoCheckTokens && hasNoTokens) ||
    (isExternalRouteVisible && (externalRouteData ?? false) && hasNoTokens)
  );
};
