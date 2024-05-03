import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Text, TextVariants, Truncate, FlexItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import ModelLabels from './ModelLabels';
import ModelTimestamp from './ModelTimestamp';
import { modelVersionUrl } from './routeUtils';

type ModelVersionsTableRowProps = {
  modelVersion: ModelVersion;
};

const ModelVersionsTableRow: React.FC<ModelVersionsTableRowProps> = ({ modelVersion: mv }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);

  return (
    <Tr>
      <Td dataLabel="Model version name">
        <div id="model-version-name" data-testid="model-version-name">
          <FlexItem>
            <Link
              to={modelVersionUrl(
                mv.id,
                mv.registeredModelId,
                preferredModelRegistry?.metadata.name,
              )}
            >
              <Truncate content={mv.name} />
            </Link>
          </FlexItem>
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
};

export default ModelVersionsTableRow;
