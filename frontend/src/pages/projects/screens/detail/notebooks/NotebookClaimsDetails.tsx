import * as React from 'react';
import ClaimsSection from '@odh-dashboard/hardware-profiles/shared/dra/ClaimsSection';
import { POLL_INTERVAL } from '@odh-dashboard/ui-core/utilities';
import { NotebookKind } from '#~/k8sTypes';
import { useNotebookClaims } from './useNotebookClaims';

type NotebookClaimsDetailsProps = {
  notebook: NotebookKind;
  runningPodUid?: string;
  /** Row expansion; nothing is fetched or rendered while collapsed. */
  isExpanded: boolean;
};

const NotebookClaimsDetails: React.FC<NotebookClaimsDetailsProps> = ({
  notebook,
  runningPodUid,
  isExpanded,
}) => {
  const { podsLoaded, podsError, group, containerNames } = useNotebookClaims(notebook, {
    enabled: isExpanded,
    runningPodUid,
    refreshRate: POLL_INTERVAL,
  });
  const groups = React.useMemo(() => [group], [group]);

  if (!isExpanded) {
    return null;
  }
  return (
    <ClaimsSection
      groups={groups}
      namespace={notebook.metadata.namespace}
      containerNames={containerNames}
      containerLabel="workbench container"
      isLoading={!podsLoaded && !podsError}
      isLoaded={podsLoaded || !!podsError}
      loadError={podsError}
      // Without a first Pod list the missing Pod is unknown, not confirmed absent.
      podsFailed={!podsLoaded && !!podsError}
    />
  );
};

export default NotebookClaimsDetails;
