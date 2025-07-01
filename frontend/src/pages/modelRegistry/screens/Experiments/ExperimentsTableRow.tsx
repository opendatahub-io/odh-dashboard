import { Td, Tr } from '@patternfly/react-table';
import { Timestamp } from '@patternfly/react-core';
import * as React from 'react';
import { RegistryExperiment } from '#~/concepts/modelRegistry/types.ts';

type ExperimentsTableRowProps = {
  experiment: RegistryExperiment;
};

const ExperimentsTableRow: React.FC<ExperimentsTableRowProps> = ({ experiment }) => (
  <Tr>
    <Td dataLabel="Experiment name">
      <div>
        <strong>{experiment.name || 'Unnamed'}</strong>
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

export default ExperimentsTableRow;
