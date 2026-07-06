import { TokenAuthenticationFieldData } from '../fields/TokenAuthenticationField';

type ShowAuthWarningProps = {
  shouldAutoCheckTokens: boolean;
  isExternalRouteVisible: boolean;
  externalRouteData?: boolean;
  tokenAuthData?: TokenAuthenticationFieldData;
};

export const showAuthWarning = ({
  shouldAutoCheckTokens,
  isExternalRouteVisible,
  externalRouteData,
  tokenAuthData,
}: ShowAuthWarningProps): boolean => {
  const hasNoTokens = !tokenAuthData || tokenAuthData.length === 0;
  return (
    (shouldAutoCheckTokens && hasNoTokens) ||
    (isExternalRouteVisible && (externalRouteData ?? false) && hasNoTokens)
  );
};
