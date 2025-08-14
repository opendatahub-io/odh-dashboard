import * as React from 'react';
import { DashboardEmptyTableView, Table } from 'mod-arch-shared';
import { ModelVersion } from '~/app/types';
import { mvColumns } from '~/app/pages/modelRegistry/screens/ModelVersions/ModelVersionsTableColumns';
import ModelVersionsTableRow from '~/app/pages/modelRegistry/screens/ModelVersions/ModelVersionsTableRow';
import { MRDeploymentsContextProvider } from '~/odh/components/MRDeploymentsContextProvider';
import { useDeploymentsState } from '~/odh/hooks/useDeploymentsState';

type OdhModelVersionsTableProps = {
    clearFilters: () => void;
    modelVersions: ModelVersion[];
    isArchiveModel?: boolean;
    refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'toolbarContent'>>;

const OdhModelVersionsTable: React.FC<OdhModelVersionsTableProps> = ({
  clearFilters,
  modelVersions,
  toolbarContent,
  isArchiveModel,
  refresh,
}) => {
  const { deployments } = useDeploymentsState();
  const hasDeploys = (mvId: string) =>
    !!inferenceServices.data.items.some(
        (s) => s.metadata.labels?.[KnownLabels.MODEL_VERSION_ID] === mvId,
    );
  return <div>OdhModelVersionsTable</div>;
};

export default OdhModelVersionsTable;