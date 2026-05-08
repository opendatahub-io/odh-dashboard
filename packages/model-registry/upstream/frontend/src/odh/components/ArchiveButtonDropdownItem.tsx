import { DropdownItem } from '@patternfly/react-core';
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { ModelVersion } from '~/app/types';
import useModelVersionsByRegisteredModel from '~/app/hooks/useModelVersionsByRegisteredModel';
import { useModelDeploymentDetection } from '~/odh/utils/deploymentUtils';

type ArchiveButtonDropdownItemProps = {
  mv?: ModelVersion;
  setIsArchiveModalOpen: (isOpen: boolean) => void;
};

const ArchiveButtonDropdownItemContent: React.FC<ArchiveButtonDropdownItemProps> = ({
  mv,
  setIsArchiveModalOpen,
}) => {
  const { registeredModelId: rmId } = useParams();
  const [rmModelVersions, rmMvLoaded] = useModelVersionsByRegisteredModel(rmId);
  const { hasModelVersionDeployment, hasRegisteredModelDeploymentByVersionIds } =
    useModelDeploymentDetection();

  const mvIds = React.useMemo(() => {
    if (!rmMvLoaded) {
      return [];
    }
    return rmModelVersions.items.map((v) => v.id);
  }, [rmMvLoaded, rmModelVersions.items]);

  const { hasDeployment, isLoading } = React.useMemo(() => {
    if (mv) {
      // For model versions: check if this specific version is deployed
      // This path doesn't need to wait for registered model data
      const result = hasModelVersionDeployment(mv.id);
      return { hasDeployment: result.hasDeployment, isLoading: !result.loaded };
    }
    if (!rmId) {
      // No registered model ID available
      return { hasDeployment: false, isLoading: false };
    }
    if (!rmMvLoaded) {
      // Still loading registered model versions - be conservative
      return { hasDeployment: true, isLoading: true };
    }
    // For registered models: check if any version of this registered model is deployed
    const result = hasRegisteredModelDeploymentByVersionIds(mvIds);
    return { hasDeployment: result.hasDeployment, isLoading: !result.loaded };
  }, [
    mv,
    rmId,
    rmMvLoaded,
    mvIds,
    hasModelVersionDeployment,
    hasRegisteredModelDeploymentByVersionIds,
  ]);

  const isDisabled = isLoading || hasDeployment;
  return (
    <DropdownItem
      id={`${mv ? 'archive-version-button' : 'archive-model-button'}-${mv?.id ?? rmId ?? 'global'}`}
      aria-label={mv ? 'Archive model version' : 'Archive model'}
      onClick={() => setIsArchiveModalOpen(true)}
      isAriaDisabled={isDisabled}
      tooltipProps={
        !isLoading && hasDeployment
          ? {
              content: mv
                ? 'Deployed model versions cannot be archived.'
                : 'Models with deployed versions cannot be archived.',
            }
          : undefined
      }
    >
      {mv ? 'Archive model version' : 'Archive model'}
    </DropdownItem>
  );
};

const ArchiveButtonDropdownItem: React.FC<ArchiveButtonDropdownItemProps> = ({
  mv,
  setIsArchiveModalOpen,
}) => (
  // For model versions: rely on parent context (ModelVersionDetails page already has deployment context)
  // For registered models: rely on parent context (ModelVersions page already has deployment context)
  <ArchiveButtonDropdownItemContent mv={mv} setIsArchiveModalOpen={setIsArchiveModalOpen} />
);
export default ArchiveButtonDropdownItem;
