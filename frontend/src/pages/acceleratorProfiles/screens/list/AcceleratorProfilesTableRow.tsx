import * as React from 'react';
import {
  Text,
  TextContent,
  TextVariants,
  Timestamp,
  TimestampTooltipVariant,
  Truncate,
} from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { AcceleratorKind } from '~/k8sTypes';
import AcceleratorProfileEnableToggle from '~/pages/acceleratorProfiles/screens/list/AcceleratorProfileEnableToggle';
import { relativeTime } from '~/utilities/time';

type AcceleratorProfilesTableRow = {
  accelerator: AcceleratorKind;
  handleDelete: (accelerator: AcceleratorKind) => void;
};

const AcceleratorProfilesTableRow: React.FC<AcceleratorProfilesTableRow> = ({
  accelerator,
  handleDelete,
}) => {
  const navigate = useNavigate();
  const modifiedDate = accelerator.metadata.annotations?.['opendatahub.io/modified-date'];

  return (
    <Tr>
      <Td dataLabel="Name">
        <TextContent>
          <Text>
            <Truncate content={accelerator.spec.displayName} />
          </Text>
          {accelerator.spec.description && (
            <Text component={TextVariants.small}>
              <Truncate content={accelerator.spec.description} />
            </Text>
          )}
        </TextContent>
      </Td>
      <Td dataLabel="Identifier">{accelerator.spec.identifier}</Td>
      <Td dataLabel="Enable">
        <AcceleratorProfileEnableToggle
          enabled={accelerator.spec.enabled}
          name={accelerator.metadata.name}
        />
      </Td>
      <Td dataLabel="Last modified">
        {modifiedDate && !isNaN(new Date(modifiedDate).getTime()) ? (
          <Timestamp
            date={new Date(modifiedDate)}
            tooltip={{
              variant: TimestampTooltipVariant.default,
            }}
          >
            {relativeTime(Date.now(), new Date(modifiedDate).getTime())}
          </Timestamp>
        ) : (
          '--'
        )}
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit',
              onClick: () => navigate(`/acceleratorProfiles/edit/${accelerator.metadata.name}`),
            },
            {
              title: 'Delete',
              onClick: () => handleDelete(accelerator),
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default AcceleratorProfilesTableRow;
