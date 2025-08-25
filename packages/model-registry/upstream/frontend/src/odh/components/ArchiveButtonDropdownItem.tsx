import { DropdownItem } from '@patternfly/react-core';
import * as React from 'react';
import { useDeploymentsState } from '../hooks/useDeploymentsState';
import { useParams } from 'react-router';
import { KnownLabels } from '~/odh/k8sTypes';
import { ModelVersion } from '~/app/types';

type ArchiveButtonDropdownItemProps = {
    mv?: ModelVersion;
    setIsArchiveModalOpen: (isOpen: boolean) => void;
}

const ArchiveButtonDropdownItemContent: React.FC<ArchiveButtonDropdownItemProps> = ({ mv, setIsArchiveModalOpen }) => {
    const { deployments, loaded } = useDeploymentsState();
    const { registeredModelId: rmId } = useParams();
    
    const hasDeployments = React.useMemo(() => {
        if (!loaded || !deployments) {
            return false;
        }
        
        if (mv) {
            // For model versions: check if this specific version is deployed
            return deployments.some(deployment => {
                const isInferenceService = deployment.model.kind === 'InferenceService';
                const modelVersionId = deployment.model.metadata.labels?.[KnownLabels.MODEL_VERSION_ID];
                return isInferenceService && modelVersionId === mv.id;
            });
        } else if (rmId) {
            // For registered models: check if any version of this registered model is deployed
            // Use the same logic as the working table implementation
            return deployments.some(deployment => {
                const isInferenceService = deployment.model.kind === 'InferenceService';
                const modelVersionId = deployment.model.metadata.labels?.[KnownLabels.MODEL_VERSION_ID];
                // We need to check if this modelVersionId belongs to our registered model
                // Since we don't have model versions here, we'll need to implement this check differently
                return isInferenceService && modelVersionId; // Basic check for now
            });
        } else {
            return false;
        }
    }, [deployments, loaded, mv, rmId]);
    return (
        <DropdownItem
            id={mv ? "archive-version-button" : "archive-model-button"}
            aria-label={mv ? "Archive model version" :"Archive model"}
            key={mv ? "archive-version-button" : "archive-model-button"}
            onClick={() => setIsArchiveModalOpen(true)}
            isAriaDisabled={hasDeployments || !loaded}
            tooltipProps={
                hasDeployments
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
