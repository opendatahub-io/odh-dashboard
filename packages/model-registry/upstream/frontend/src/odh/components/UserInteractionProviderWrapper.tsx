import * as React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isUserInteractionProviderExtension } from '~/odh/extension-points';
import { UserInteractionContext } from '~/concepts/userInteraction';

type UserInteractionProviderWrapperProps = {
  children: React.ReactNode;
};

const UserInteractionProviderWrapper: React.FC<UserInteractionProviderWrapperProps> = ({
  children,
}) => {
  const [extensions, loaded] = useResolvedExtensions(isUserInteractionProviderExtension);

  if (loaded && extensions.length > 0) {
    const DataProvider = extensions[0].properties.component.default;
    return (
      <DataProvider>
        {(api) => (
          <UserInteractionContext.Provider value={api}>{children}</UserInteractionContext.Provider>
        )}
      </DataProvider>
    );
  }

  return <>{children}</>;
};

export default UserInteractionProviderWrapper;
