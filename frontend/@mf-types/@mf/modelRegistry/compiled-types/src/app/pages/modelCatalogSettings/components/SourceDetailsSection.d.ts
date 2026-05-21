import * as React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { ManageSourceFormData } from '~/app/pages/modelCatalogSettings/useManageSourceData';
type SourceDetailsSectionProps = {
    formData: ManageSourceFormData;
    setData: UpdateObjectAtPropAndValue<ManageSourceFormData>;
    isEditMode: boolean;
};
declare const SourceDetailsSection: React.FC<SourceDetailsSectionProps>;
export default SourceDetailsSection;
