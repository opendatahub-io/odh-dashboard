import { DropdownItem } from '@patternfly/react-core';
import * as React from 'react';
import { MRDeploymentsContextProvider } from './MRDeploymentsContextProvider';
import { useDeploymentsState } from '../hooks/useDeploymentsState';
import { useParams } from 'react-router';
import { KnownLabels } from '~/odh/k8sTypes';

type ArchiveButtonDropdownItemProps = {
    setIsArchiveModalOpen: (isOpen: boolean) => void;
}

const ArchiveButtonDropdownItemContent: React.FC<Omit<ArchiveButtonDropdownItemProps, 'rm'>> = ({ setIsArchiveModalOpen }) => {
    const { deployments, loaded } = useDeploymentsState();
    const hasDeployments = deployments && deployments.length > 0;
    const tooltipRef = React.useRef<HTMLButtonElement>(null);
    return (
        <DropdownItem
            id="archive-model-button"
            aria-label="Archive model"
            key="archive-model-button"
            onClick={() => setIsArchiveModalOpen(true)}
            ref={tooltipRef}
            isAriaDisabled={hasDeployments || !loaded}
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
    const { registeredModelId: rmId } = useParams();
    const labelSelectors = React.useMemo(() => {
        if (!rmId) {
          return undefined;
        }
        return {
          [KnownLabels.REGISTERED_MODEL_ID]: rmId,
        }
    }, [rmId]);
    return (
    <MRDeploymentsContextProvider labelSelectors={labelSelectors}>
        <ArchiveButtonDropdownItemContent setIsArchiveModalOpen={setIsArchiveModalOpen} />
    </MRDeploymentsContextProvider>
  );
};

export default ArchiveButtonDropdownItem;
