import { useExtensions } from "@odh-dashboard/plugin-core";
import React from "react";
import { isModelRegistryVersionDetailsTabExtension } from "./extension-points";
import ModelVersionsDetails from "~/app/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetails";
import ModelVersionsArchiveDetails from "~/app/pages/modelRegistry/screens/ModelVersionsArchive/ModelVersionArchiveDetails";
import ArchiveModelVersionDetails from "~/app/pages/modelRegistry/screens/ModelVersionsArchive/ArchiveModelVersionDetails";
import { Route } from "react-router-dom";

export const generateVersionDetailsTabExtensionRoutes = ({ isModelVersionsArchiveDetails, isArchiveModelVersionDetails }: { isModelVersionsArchiveDetails?: boolean, isArchiveModelVersionDetails?: boolean }) => {
    const tabExtensions = useExtensions(isModelRegistryVersionDetailsTabExtension);
    return tabExtensions.map((extension) => (
        <Route
        key={extension.properties.id}
        path={extension.properties.id}
        element={
            isModelVersionsArchiveDetails 
            ? <ModelVersionsArchiveDetails
                tab={extension.properties.id}
                empty={false}
            />
            : isArchiveModelVersionDetails
            ? <ArchiveModelVersionDetails
                tab={extension.properties.id}
                empty={false}
                />
            : <ModelVersionsDetails
                tab={extension.properties.id}
                empty={false}
                /> 
        }
        />
    ));
};
