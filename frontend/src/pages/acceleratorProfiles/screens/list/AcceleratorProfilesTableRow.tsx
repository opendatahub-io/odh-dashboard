import * as React from 'react';
import { Timestamp, TimestampTooltipVariant, Truncate } from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import AcceleratorProfileEnableToggle from '#~/pages/acceleratorProfiles/screens/list/AcceleratorProfileEnableToggle';
import { relativeTime } from '#~/utilities/time';
import { TableRowTitleDescription } from '#~/components/table';

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
        <TableRowTitleDescription
          title={<Truncate content={acceleratorProfile.spec.displayName} />}
          description={acceleratorProfile.spec.description}
          truncateDescriptionLines={2}
        />
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
