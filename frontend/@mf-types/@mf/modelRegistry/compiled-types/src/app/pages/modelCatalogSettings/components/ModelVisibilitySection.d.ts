import * as React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { ManageSourceFormData } from '~/app/pages/modelCatalogSettings/useManageSourceData';
type ModelVisibilitySectionProps = {
    formData: ManageSourceFormData;
    setData: UpdateObjectAtPropAndValue<ManageSourceFormData>;
    isDefaultExpanded?: boolean;
};
declare const ModelVisibilitySection: React.FC<ModelVisibilitySectionProps>;
export default ModelVisibilitySection;
