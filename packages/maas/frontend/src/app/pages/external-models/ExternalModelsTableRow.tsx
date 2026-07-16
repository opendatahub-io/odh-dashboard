import * as React from 'react';
import { ResourceTr } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { ActionsColumn, Tbody, Td } from '@patternfly/react-table';
import { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import { ExternalModel } from '~/app/types/external-models';
import { externalModelsColumns } from './columns';

type ExternalModelTableRowProps = {
  externalModel: ExternalModel;
  setDeleteExternalModel: (externalModel: ExternalModel) => void;
};

const ExternalModelTableRow: React.FC<ExternalModelTableRowProps> = ({
  externalModel,
  setDeleteExternalModel,
}) => {
  const nameCell = (
    <Td dataLabel={externalModelsColumns[0].label}>
      <TableRowTitleDescription
        title={
          <span data-testid="external-model-name">
            {externalModel.displayName ?? externalModel.name}
          </span>
        }
        description={externalModel.description ?? ''}
        truncateDescriptionLines={2}
      />
    </Td>
  );

  const phaseCell = (
    <Td dataLabel={externalModelsColumns[1].label}>
      <PhaseLabel
        phase={externalModel.phase}
        statusMessage={externalModel.statusMessage}
        resourceType={PhaseResourceType.EXTERNAL_MODEL}
      />
    </Td>
  );

  const actionsCell = (
    <Td isActionCell>
      <ActionsColumn
        data-testid="external-model-actions"
        items={[
          {
            title: 'Delete',
            onClick: () => setDeleteExternalModel(externalModel),
          },
        ]}
      />
    </Td>
  );

  const externalModelResource: K8sResourceCommon = {
    apiVersion: 'maas.opendatahub.io/v1alpha1',
    kind: 'MaaSExternalModel',
    metadata: {
      name: externalModel.name,
      namespace: externalModel.namespace,
    },
  };

  return (
    <Tbody>
      <ResourceTr resource={externalModelResource} isControlRow data-testid="external-model-row">
        {nameCell}
        {phaseCell}
        {actionsCell}
      </ResourceTr>
    </Tbody>
  );
};

export default ExternalModelTableRow;
