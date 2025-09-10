import React from "react";
import { ModelRegistryDetailsTabExtension } from "~/odh/extension-points/details";
import OdhModelVersions from "~/odh/components/OdhModelVersions";
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
        <OdhModelVersions
          tab={extension.properties.id}
          empty={false}
        />
      }
    />
  ));
};
