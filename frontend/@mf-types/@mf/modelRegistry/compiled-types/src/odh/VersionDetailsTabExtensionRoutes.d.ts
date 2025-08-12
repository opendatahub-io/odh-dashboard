import React from "react";
import { ModelRegistryVersionDetailsTabExtension } from "./extension-points";
import { LoadedExtension } from "@openshift/dynamic-plugin-sdk";
export declare const generateVersionDetailsTabExtensionRoutes: ({ isModelVersionsArchiveDetails, isArchiveModelVersionDetails, tabExtensions }: {
    isModelVersionsArchiveDetails?: boolean;
    isArchiveModelVersionDetails?: boolean;
    tabExtensions: LoadedExtension<ModelRegistryVersionDetailsTabExtension>[];
}) => React.JSX.Element[];
