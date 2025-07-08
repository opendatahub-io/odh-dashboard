import * as React from 'react';
import { DropdownItem } from '@patternfly/react-core';
import { ModelVersion } from '@odh-dashboard/internal/concepts/modelRegistry/types';
import useInferenceServices from '@odh-dashboard/internal/pages/modelServing/useInferenceServices';

interface ArchiveButtonProps {
  mv: ModelVersion;
  mrName?: string;
  setIsArchiveModalOpen: (value: React.SetStateAction<boolean>) => void;
}

const ArchiveButton = React.forwardRef<HTMLButtonElement, ArchiveButtonProps>(
  ({ mv, mrName, setIsArchiveModalOpen }, ref) => {
    const inferenceServices = useInferenceServices(undefined, mv.registeredModelId, mv.id, mrName);
    const hasDeployment = inferenceServices.data.items.length > 0;
    return (
      <DropdownItem
        isAriaDisabled={hasDeployment}
        id="archive-version-button"
        aria-label="Archive model version"
        key="archive-version-button"
        onClick={() => setIsArchiveModalOpen(true)}
        tooltipProps={
          hasDeployment ? { content: 'Deployed model versions cannot be archived' } : undefined
        }
        ref={ref}
      >
        Archive model version
      </DropdownItem>
    );
  },
);

ArchiveButton.displayName = 'ArchiveButton';

export default ArchiveButton;
