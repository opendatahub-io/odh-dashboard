import React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { ModelRegistryKind } from '~/k8sTypes';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import ViewDatabaseConfigModal from './ViewDatabaseConfigModal';
import DeleteModelRegistryModal from './DeleteModelRegistryModal';
import { ModelRegistryTableRowStatus } from './ModelRegistryTableRowStatus';

type ModelRegistriesTableRowProps = {
  modelRegistry: ModelRegistryKind;
  refresh: () => Promise<unknown>;
};

const ModelRegistriesTableRow: React.FC<ModelRegistriesTableRowProps> = ({
  modelRegistry: mr,
  refresh,
}) => {
  const [isDatabaseConfigModalOpen, setIsDatabaseConfigModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  return (
    <>
      <Tr>
        <Td dataLabel="Model registry name">
          <ResourceNameTooltip resource={mr}>
            <strong>
              {mr.metadata.annotations?.['openshift.io/display-name'] || mr.metadata.name}
            </strong>
          </ResourceNameTooltip>
          {mr.metadata.annotations?.['openshift.io/description'] && (
            <p>{mr.metadata.annotations['openshift.io/description']}</p>
          )}
        </Td>
        <Td dataLabel="Status">
          <ModelRegistryTableRowStatus conditions={mr.status?.conditions} />
        </Td>
        <Td modifier="fitContent">
          <Link
            aria-label={`Manage permissions for model registry ${mr.metadata.name}`}
            to={`/modelRegistrySettings/permissions/${mr.metadata.name}`}
          >
            Manage permissions
          </Link>
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'View database configuration',
                onClick: () => setIsDatabaseConfigModalOpen(true),
              },
              {
                title: 'Delete model registry',
                onClick: () => setIsDeleteModalOpen(true),
              },
            ]}
          />
        </Td>
      </Tr>
      {isDatabaseConfigModalOpen ? (
        <ViewDatabaseConfigModal
          modelRegistry={mr}
          onClose={() => setIsDatabaseConfigModalOpen(false)}
        />
      ) : null}
      {isDeleteModalOpen ? (
        <DeleteModelRegistryModal
          modelRegistry={mr}
          onClose={() => setIsDeleteModalOpen(false)}
          refresh={refresh}
        />
      ) : null}
    </>
  );
};

export default ModelRegistriesTableRow;
