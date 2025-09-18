import * as React from 'react';
import { ModelVersion } from '~/app/types';
type ArchiveButtonDropdownItemProps = {
    mv?: ModelVersion;
    setIsArchiveModalOpen: (isOpen: boolean) => void;
};
declare const ArchiveButtonDropdownItem: React.FC<ArchiveButtonDropdownItemProps>;
export default ArchiveButtonDropdownItem;
