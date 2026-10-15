import * as React from 'react';
import type { ServingRuntime } from '~/odh/types/servingRuntimeCatalogTypes';
type RuntimeCatalogCardProps = {
    runtime: ServingRuntime;
};
declare const RuntimeCatalogCard: React.FC<RuntimeCatalogCardProps>;
export default RuntimeCatalogCard;
