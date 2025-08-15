import { DropdownItem } from '@patternfly/react-core';
import * as React from 'react';
import { MRDeploymentsContextProvider } from './MRDeploymentsContextProvider';
import { useDeploymentsState } from '../hooks/useDeploymentsState';
import { useParams } from 'react-router';
import { KnownLabels } from '~/odh/k8sTypes';

type ArchiveButtonDropdownItemProps = {
    setIsArchiveModalOpen: (isOpen: boolean) => void;
}

const ArchiveButtonDropdownItemContent: React.FC<ArchiveButtonDropdownItemProps> = ({ setIsArchiveModalOpen }) => {
    const { deployments } = useDeploymentsState();
    const hasDeployments = deployments && deployments.length > 0;
    const tooltipRef = React.useRef<HTMLButtonElement>(null);
    return (
        <DropdownItem
            id="archive-model-button"
            aria-label="Archive model"
            key="archive-model-button"
            onClick={() => setIsArchiveModalOpen(true)}
            ref={tooltipRef}
            isAriaDisabled={hasDeployments}
            tooltipProps={
                hasDeployments
                ? { content: 'Models with deployed versions cannot be archived.' }
                : undefined
            }
            >
            Archive model
        </DropdownItem>
    );
};

const ArchiveButtonDropdownItem: React.FC<ArchiveButtonDropdownItemProps> = ({ setIsArchiveModalOpen }) => {
    const { modelVersionId: mvId, registeredModelId: rmId } = useParams();
    const labelSelectors = React.useMemo(() => {
        if (!rmId || !mvId) {
          return undefined;
        }
        return {
          [KnownLabels.REGISTERED_MODEL_ID]: rmId,
          [KnownLabels.MODEL_VERSION_ID]: mvId,
        };
    }, [rmId, mvId]);
    return (
    <MRDeploymentsContextProvider labelSelectors={labelSelectors}>
        <ArchiveButtonDropdownItemContent setIsArchiveModalOpen={setIsArchiveModalOpen} />
    </MRDeploymentsContextProvider>
  );
};

export default ArchiveButtonDropdownItem;
