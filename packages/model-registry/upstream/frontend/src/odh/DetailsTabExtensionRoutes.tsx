import React from "react";
import { ModelRegistryDetailsTabExtension } from "./extension-points";
import ModelVersions from "~/app/pages/modelRegistry/screens/ModelVersions/ModelVersions";
import { Route } from "react-router-dom";
import { LoadedExtension } from "@openshift/dynamic-plugin-sdk";

export const generateDetailsTabExtensionRoutes = ({ 
  tabExtensions 
}: { 
  tabExtensions: LoadedExtension<ModelRegistryDetailsTabExtension>[] 
}) => {
  return tabExtensions.map((extension) => (
    <Route
      key={extension.properties.id}
      path={extension.properties.id}
      element={
        <ModelVersions
          tab={extension.properties.id}
          empty={false}
        />
      }
    />
  ));
};
