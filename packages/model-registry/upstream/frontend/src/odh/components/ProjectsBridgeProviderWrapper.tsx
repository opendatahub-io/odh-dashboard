import * as React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { isProjectsBridgeProviderExtension } from '~/odh/extension-points';
import { ProjectsBridgeContext } from '~/odh/context/ProjectsBridgeContext';

type ProjectsBridgeProviderWrapperProps = {
  children: React.ReactNode;
};

const ProjectsBridgeProviderWrapper: React.FC<ProjectsBridgeProviderWrapperProps> = ({
  children,
}) => {
  const [extensions, loaded] = useResolvedExtensions(isProjectsBridgeProviderExtension);

  if (loaded && extensions.length > 0) {
    const DataProvider = extensions[0].properties.component.default;
    return (
      <DataProvider>
        {(data) => (
          <ProjectsBridgeContext.Provider value={data}>{children}</ProjectsBridgeContext.Provider>
        )}
      </DataProvider>
    );
  }

  return <>{children}</>;
};

export default ProjectsBridgeProviderWrapper;
