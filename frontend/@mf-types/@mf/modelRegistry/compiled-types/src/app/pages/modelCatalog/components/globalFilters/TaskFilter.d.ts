import * as React from 'react';
import { CatalogFilterOptions, ModelCatalogStringFilterOptions } from '~/app/modelCatalogTypes';
type TaskFilterProps = {
    filters?: Extract<CatalogFilterOptions, Partial<ModelCatalogStringFilterOptions>>;
};
declare const TaskFilter: React.FC<TaskFilterProps>;
export default TaskFilter;
