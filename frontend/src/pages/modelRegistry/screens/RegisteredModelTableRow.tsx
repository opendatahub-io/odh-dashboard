import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { FlexItem, Text, TextVariants, Truncate } from '@patternfly/react-core';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import RegisteredModelOwner from './RegisteredModelOwner';
import ModelLabels from './ModelLabels';
import ModelTimestamp from './ModelTimestamp';
import { ModelVersionsTabs } from './const';
import { registeredModelUrl } from './routeUtils';

type RegisteredModelTableRowProps = {
  registeredModel: RegisteredModel;
};

const RegisteredModelTableRow: React.FC<RegisteredModelTableRowProps> = ({
  registeredModel: rm,
}) => {
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const rmUrl = registeredModelUrl(rm.id, preferredModelRegistry?.metadata.name);

  return (
    <Tr>
      <Td dataLabel="Model name">
        <div id="model-name" data-testid="model-name">
          <FlexItem>
            <Link to={rmUrl}>
              <Truncate content={rm.name} />
            </Link>
          </FlexItem>
        </div>
        {rm.description && (
          <Text data-testid="description" component={TextVariants.small}>
            <Truncate content={rm.description} />
          </Text>
        )}
      </Td>
      <Td dataLabel="Labels">
        <ModelLabels customProperties={rm.customProperties} name={rm.name} />
      </Td>
      <Td dataLabel="Last modified">
        <ModelTimestamp timeSinceEpoch={rm.lastUpdateTimeSinceEpoch} />
      </Td>
      <Td dataLabel="Owner">
        <RegisteredModelOwner registeredModelId={rm.id} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'View details',
              onClick: () => navigate(`${rmUrl}/${ModelVersionsTabs.DETAILS}`),
            },
            {
              title: 'Archive model',
              isDisabled: true, // This feature is currently disabled but will be enabled in a future PR post-summit release.
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default RegisteredModelTableRow;
