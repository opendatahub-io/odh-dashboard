import React from 'react';
import { Route } from 'react-router-dom';
import { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { ModelRegistryDetailsTabExtension } from '~/odh/extension-points/details';
import ModelVersions from '~/app/pages/modelRegistry/screens/ModelVersions/ModelVersions';

export const generateDetailsTabExtensionRoutes = ({
  tabExtensions,
}: {
  tabExtensions: LoadedExtension<ModelRegistryDetailsTabExtension>[];
}): React.ReactElement[] =>
  tabExtensions.map((extension) => (
    <Route
      key={extension.properties.id}
      path={extension.properties.id}
      element={<ModelVersions tab={extension.properties.id} empty={false} />}
    />
  ));
