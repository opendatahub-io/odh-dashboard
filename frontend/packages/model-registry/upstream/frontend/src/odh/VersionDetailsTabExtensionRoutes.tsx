import React from "react";
import { ModelRegistryVersionDetailsTabExtension } from "./extension-points";
import ModelVersionsDetails from "~/app/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetails";
import ModelVersionsArchiveDetails from "~/app/pages/modelRegistry/screens/ModelVersionsArchive/ModelVersionArchiveDetails";
import ArchiveModelVersionDetails from "~/app/pages/modelRegistry/screens/ModelVersionsArchive/ArchiveModelVersionDetails";
import { Route } from "react-router-dom";
import { LoadedExtension } from "@openshift/dynamic-plugin-sdk";
import OdhModelVersionDetails from "./components/OdhModelVersionDetails";

export const generateVersionDetailsTabExtensionRoutes = ({ isModelVersionsArchiveDetails, isArchiveModelVersionDetails, tabExtensions }: { isModelVersionsArchiveDetails?: boolean, isArchiveModelVersionDetails?: boolean, tabExtensions: LoadedExtension<ModelRegistryVersionDetailsTabExtension>[] }) => {
    return tabExtensions.map((extension) => (
        <Route
            key={extension.properties.id}
            path={extension.properties.id}
            element={
                isModelVersionsArchiveDetails 
                ? <OdhModelVersionDetails
                    element={<ModelVersionsArchiveDetails
                    tab={extension.properties.id}
                    empty={false}
                    />}
                />
                : isArchiveModelVersionDetails
                ? <OdhModelVersionDetails
                    element={<ArchiveModelVersionDetails
                    tab={extension.properties.id}
                    empty={false}
                    />}
                />
                : <OdhModelVersionDetails
                    element={<ModelVersionsDetails
                    tab={extension.properties.id}
                    empty={false}
                    />}
                />
            }
        />
    ));
};
