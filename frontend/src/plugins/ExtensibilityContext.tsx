import * as React from 'react';
import { FeatureFlags, PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { useAppContext } from '~/app/AppContext';
import { AreaContext } from '~/concepts/areas/AreaContext';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { SupportedArea } from '~/concepts/areas';
import { enumIterator } from '~/utilities/utils';
import { isAreaAvailable } from '~/concepts/areas/utils';
import { useUser } from '~/redux/selectors';
import { PluginStore } from '~/plugins/plugin-store';
import extensionDeclarations from '~/plugins/extensions';
import modelServingExtensionDeclarations from '~/packages/modelServing/extensions';
import kServeExtensionDeclarations from '~/packages/kserve/extensions';
import modelMeshExtensionDeclarations from '~/packages/modelMesh/extensions';

const allExtensions = [
  ...extensionDeclarations,
  ...modelServingExtensionDeclarations,
  ...kServeExtensionDeclarations,
  ...modelMeshExtensionDeclarations,
];

export const ExtensibilityContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isAdmin } = useUser();
  // Copied from useIsAreaAvailable to read all areas at once
  const { dashboardConfig } = useAppContext();
  const { dscStatus, dsciStatus } = React.useContext(AreaContext);
  const dashboardConfigSpecSafe = useDeepCompareMemoize(dashboardConfig.spec);
  const dscStatusSafe = useDeepCompareMemoize(dscStatus);
  const dsciStatusSafe = useDeepCompareMemoize(dsciStatus);

  // track all areas enablement
  const flags: FeatureFlags = React.useMemo(
    () =>
      enumIterator(SupportedArea).reduce<FeatureFlags>((acc, [, area]) => {
        acc[area] = isAreaAvailable(
          area,
          dashboardConfigSpecSafe,
          dscStatusSafe,
          dsciStatusSafe,
        ).status;
        return acc;
      }, {}),
    [dashboardConfigSpecSafe, dscStatusSafe, dsciStatusSafe],
  );

  // create the plugin store
  const store = React.useMemo(() => new PluginStore(allExtensions), []);

  // update the feature flags on the plugin store
  React.useEffect(
    () => store.setFeatureFlags({ ...flags, ADMIN_USER: isAdmin }),
    [flags, store, isAdmin],
  );

  return <PluginStoreProvider store={store}>{children}</PluginStoreProvider>;
};
