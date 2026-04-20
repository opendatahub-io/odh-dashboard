import React from 'react';
import { Route } from 'react-router-dom';
import { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import ModelVersionsDetails from '~/app/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetails';
import ModelVersionsArchiveDetails from '~/app/pages/modelRegistry/screens/ModelVersionsArchive/ModelVersionArchiveDetails';
import ArchiveModelVersionDetails from '~/app/pages/modelRegistry/screens/ModelVersionsArchive/ArchiveModelVersionDetails';
import { ModelRegistryVersionDetailsTabExtension } from './extension-points';

export const generateVersionDetailsTabExtensionRoutes = ({
  isModelVersionsArchiveDetails,
  isArchiveModelVersionDetails,
  tabExtensions,
}: {
  isModelVersionsArchiveDetails?: boolean;
  isArchiveModelVersionDetails?: boolean;
  tabExtensions: LoadedExtension<ModelRegistryVersionDetailsTabExtension>[];
}): React.ReactElement[] =>
  tabExtensions.map((extension) => (
    <Route
      key={extension.properties.id}
      path={extension.properties.id}
      element={
        isModelVersionsArchiveDetails ? (
          <ModelVersionsArchiveDetails tab={extension.properties.id} empty={false} />
        ) : isArchiveModelVersionDetails ? (
          <ArchiveModelVersionDetails tab={extension.properties.id} empty={false} />
        ) : (
          <ModelVersionsDetails tab={extension.properties.id} empty={false} />
        )
      }
    />
  ));
