import * as React from 'react';
import {
  Content,
  ContentVariants,
  Timestamp,
  TimestampTooltipVariant,
  Truncate,
} from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { AcceleratorProfileKind } from '~/k8sTypes';
import AcceleratorProfileEnableToggle from '~/pages/acceleratorProfiles/screens/list/AcceleratorProfileEnableToggle';
import { relativeTime } from '~/utilities/time';

type AcceleratorProfilesTableRowType = {
  acceleratorProfile: AcceleratorProfileKind;
  handleDelete: (cr: AcceleratorProfileKind) => void;
};

const AcceleratorProfilesTableRow: React.FC<AcceleratorProfilesTableRowType> = ({
  acceleratorProfile,
  handleDelete,
}) => {
  const navigate = useNavigate();
  const modifiedDate = acceleratorProfile.metadata.annotations?.['opendatahub.io/modified-date'];

  return (
    <Tr>
      <Td dataLabel="Name">
        <Content>
          <Content component="p">
            <Truncate content={acceleratorProfile.spec.displayName} />
          </Content>
          {acceleratorProfile.spec.description && (
            <Content data-testid="description" component={ContentVariants.small}>
              <Truncate content={acceleratorProfile.spec.description} />
            </Content>
          )}
        </Content>
      </Td>
      <Td dataLabel="Identifier">{acceleratorProfile.spec.identifier}</Td>
      <Td dataLabel="Enable">
        <AcceleratorProfileEnableToggle
          enabled={acceleratorProfile.spec.enabled}
          name={acceleratorProfile.metadata.name}
        />
      </Td>
      <Td dataLabel="Last modified">
        {modifiedDate && !Number.isNaN(new Date(modifiedDate).getTime()) ? (
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
              onClick: () =>
                navigate(`/acceleratorProfiles/edit/${acceleratorProfile.metadata.name}`),
            },
            { isSeparator: true },
            {
              title: 'Delete',
              onClick: () => handleDelete(acceleratorProfile),
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default AcceleratorProfilesTableRow;
