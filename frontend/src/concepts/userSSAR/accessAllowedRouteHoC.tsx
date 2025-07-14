import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { useAccessAllowed } from '#~/concepts/userSSAR/useAccessAllowed';
import { AccessReviewResourceAttributes } from '#~/k8sTypes';
import NotFound from '#~/pages/NotFound';

/**
 * Uses useAccessAllowed to help handle Route pages easier.
 * Consider using verbModelAccess for resourceAttributes.
 *
 * Example Usage:
 *   const FooComponent: React.FC<{ props }> = () => {
 *     return <Routes>...your explicit routes....</Routes>
 *   };
 *
 *   const accessCheck = verbModelAccess('list', FooModel);
 *   export default accessAllowedRouteHoC(accessCheck)(FooComponent);
 *
 * @see verbModelAccess
 * @see useAccessAllowed
 */
export const accessAllowedRouteHoC =
  (resourceAttributes: AccessReviewResourceAttributes) =>
  <T extends React.JSX.IntrinsicAttributes>(Component: React.FC<T>): React.FC<T> => {
    const render = (props: T) => {
      // This is a render function, this is allowed
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [isAllowed, isLoaded] = useAccessAllowed(resourceAttributes, true);

      if (!isLoaded) {
        return (
          <Bullseye>
            <Spinner />
          </Bullseye>
        );
      }

      if (!isAllowed) {
        return <NotFound />;
      }

      return <Component {...props} />;
    };

    render.displayName = `AccessAllowedRoute`;

    return render;
  };
