import { DropdownItem } from '@patternfly/react-core';
import * as React from 'react';
import { MRDeploymentsContextProvider } from './MRDeploymentsContextProvider';
import { useDeploymentsState } from '../hooks/useDeploymentsState';
import { useParams } from 'react-router';
import { KnownLabels } from '~/odh/k8sTypes';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { ModelVersion } from '~/app/types';

type ArchiveButtonDropdownItemProps = {
    mv?: ModelVersion;
    setIsArchiveModalOpen: (isOpen: boolean) => void;
}

const ArchiveButtonDropdownItemContent: React.FC<ArchiveButtonDropdownItemProps> = ({ mv, setIsArchiveModalOpen }) => {
    const { deployments, loaded } = useDeploymentsState();
    const hasDeployments = deployments && deployments.length > 0;
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
    const { registeredModelId: rmId } = useParams();
    const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
    const labelSelectors = React.useMemo(() => {
        if (!rmId) {
          return undefined;
        }
        return {
          [KnownLabels.REGISTERED_MODEL_ID]: rmId,
          ...(mv && { [KnownLabels.MODEL_VERSION_ID]: mv.id }),
        };
      }, [rmId, mv]);
    return (
    <MRDeploymentsContextProvider labelSelectors={labelSelectors} mrName={preferredModelRegistry?.name}>
        <ArchiveButtonDropdownItemContent mv={mv} setIsArchiveModalOpen={setIsArchiveModalOpen} />
    </MRDeploymentsContextProvider>
  );
};

export default ArchiveButtonDropdownItem;
