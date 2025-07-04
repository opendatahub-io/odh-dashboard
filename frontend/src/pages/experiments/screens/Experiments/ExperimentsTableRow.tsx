import { Td, Tr } from '@patternfly/react-table';
import { Timestamp } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { RegistryExperiment } from '#~/concepts/modelRegistry/types';
import { experimentsRunsRoute } from '#~/routes/experiments/registryBase.ts';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext.tsx';

type ExperimentsTableRowProps = {
  experiment: RegistryExperiment;
};

const ExperimentsTableRow: React.FC<ExperimentsTableRowProps> = ({ experiment }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);

  return (
    <Tr>
      <Td dataLabel="Experiment name">
        <div>
          <Link to={experimentsRunsRoute(preferredModelRegistry?.metadata.name, experiment.id)}>
            <strong>{experiment.name || 'Unnamed'}</strong>
          </Link>
        </div>
      </Td>
      <Td dataLabel="Description">
        <div title={experiment.description}>{experiment.description || '-'}</div>
      </Td>
      <Td dataLabel="Owner">
        <div>{experiment.owner || '-'}</div>
      </Td>
      <Td dataLabel="State">
        <div>{experiment.state || 'LIVE'}</div>
      </Td>
      <Td dataLabel="Created">
        <Timestamp date={new Date(parseInt(experiment.createTimeSinceEpoch, 10))} />
      </Td>
      <Td dataLabel="Kebab" isActionCell>
        {/* TODO: Add kebab menu actions */}
      </Td>
    </Tr>
  );
};

export default ExperimentsTableRow;
