import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Text, TextVariants, Truncate } from '@patternfly/react-core';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import ModelLabels from './ModelLabels';
import ModelTimestamp from './ModelTimestamp';

type ModelVersionsTableRowProps = {
  modelVersion: ModelVersion;
};

const ModelVersionsTableRow: React.FC<ModelVersionsTableRowProps> = ({ modelVersion: mv }) => (
  <Tr>
    <Td dataLabel="Model version name">
      <div id="model-version-name" data-testid="model-version-name">
        <Truncate content={mv.name} />
      </div>
      {mv.description && (
        <Text data-testid="model-version-description" component={TextVariants.small}>
          <Truncate content={mv.description} />
        </Text>
      )}
    </Td>
    <Td dataLabel="Last modified">
      <ModelTimestamp timeSinceEpoch={mv.lastUpdateTimeSinceEpoch} />
    </Td>
    <Td dataLabel="Owner">{mv.author}</Td>
    <Td dataLabel="Labels">
      <ModelLabels customProperties={mv.customProperties} name={mv.name} />
    </Td>
    <Td isActionCell>
      <ActionsColumn
        items={[
          {
            title: 'Deploy',
            // TODO: Implement functionality for onClick. This will be added in another PR
            onClick: () => undefined,
          },
          {
            title: 'Archive version',
            isDisabled: true, // This feature is currently disabled but will be enabled in a future PR post-summit release.
          },
        ]}
      />
    </Td>
  </Tr>
);

export default ModelVersionsTableRow;
