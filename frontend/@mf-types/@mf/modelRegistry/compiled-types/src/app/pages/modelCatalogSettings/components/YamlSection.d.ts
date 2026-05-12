import * as React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { ManageSourceFormData } from '~/app/pages/modelCatalogSettings/useManageSourceData';
type YamlSectionProps = {
    formData: ManageSourceFormData;
    setData: UpdateObjectAtPropAndValue<ManageSourceFormData>;
    onToggleExpectedFormatDrawer?: () => void;
};
declare const YamlSection: React.FC<YamlSectionProps>;
export default YamlSection;
