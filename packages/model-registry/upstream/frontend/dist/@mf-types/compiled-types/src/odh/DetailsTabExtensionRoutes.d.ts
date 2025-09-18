import React from "react";
import { ModelRegistryDetailsTabExtension } from "~/odh/extension-points/details";
import { LoadedExtension } from "@openshift/dynamic-plugin-sdk";
export declare const generateDetailsTabExtensionRoutes: ({ tabExtensions }: {
    tabExtensions: LoadedExtension<ModelRegistryDetailsTabExtension>[];
}) => React.JSX.Element[];
