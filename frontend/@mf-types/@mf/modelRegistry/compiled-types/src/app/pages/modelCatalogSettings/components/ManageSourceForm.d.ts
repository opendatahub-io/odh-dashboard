import * as React from 'react';
import { CatalogSourceConfig } from '~/app/modelCatalogTypes';
type ManageSourceFormProps = {
    existingSourceConfig?: CatalogSourceConfig;
    isEditMode: boolean;
    onToggleExpectedFormatDrawer?: () => void;
};
declare const ManageSourceForm: React.FC<ManageSourceFormProps>;
export default ManageSourceForm;
