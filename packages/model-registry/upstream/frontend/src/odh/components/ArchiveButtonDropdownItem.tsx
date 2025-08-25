import { DropdownItem } from '@patternfly/react-core';
import * as React from 'react';
import { useParams } from 'react-router';
import { ModelVersion } from '~/app/types';
import useModelVersionsByRegisteredModel from '~/app/hooks/useModelVersionsByRegisteredModel';
import { useModelDeploymentDetection } from '../utils/deploymentUtils';

type ArchiveButtonDropdownItemProps = {
    mv?: ModelVersion;
    setIsArchiveModalOpen: (isOpen: boolean) => void;
}

const ArchiveButtonDropdownItemContent: React.FC<ArchiveButtonDropdownItemProps> = ({ mv, setIsArchiveModalOpen }) => {
    const { registeredModelId: rmId } = useParams();
    const [rmModelVersions, rmMvLoaded] = useModelVersionsByRegisteredModel(rmId);
    const { hasModelVersionDeployment, hasRegisteredModelDeploymentByVersionIds, loaded } = useModelDeploymentDetection();
    
    const { hasDeployment } = React.useMemo(() => {
        if (mv) {
            // For model versions: check if this specific version is deployed
            return hasModelVersionDeployment(mv.id);
        } else if (rmId && rmMvLoaded) {
            // For registered models: check if any version of this registered model is deployed
            const mvIds = rmModelVersions.items.map((v) => v.id);
            return hasRegisteredModelDeploymentByVersionIds(mvIds);
        } else {
            return { hasDeployment: false, loaded };
        }
    }, [mv, rmId, rmMvLoaded, rmModelVersions.items, hasModelVersionDeployment, hasRegisteredModelDeploymentByVersionIds, loaded]);
    return (
        <DropdownItem
            id={mv ? "archive-version-button" : "archive-model-button"}
            aria-label={mv ? "Archive model version" :"Archive model"}
            key={mv ? "archive-version-button" : "archive-model-button"}
            onClick={() => setIsArchiveModalOpen(true)}
            isAriaDisabled={!loaded || (rmId ? !rmMvLoaded : false) || hasDeployment}
            tooltipProps={
                hasDeployment
                ? { content: mv ? 'Deployed model versions cannot be archived' : 'Models with deployed versions cannot be archived.' }
                : undefined
            }
            >
            {mv ? "Archive model version" : "Archive model"}
        </DropdownItem>
    );
};

const ArchiveButtonDropdownItem: React.FC<ArchiveButtonDropdownItemProps> = ({ mv, setIsArchiveModalOpen }) => {
    // For model versions: rely on parent context (ModelVersionDetails page already has deployment context)
    // For registered models: rely on parent context (ModelVersions page already has deployment context)
    return <ArchiveButtonDropdownItemContent mv={mv} setIsArchiveModalOpen={setIsArchiveModalOpen} />;
};

export default ArchiveButtonDropdownItem;
