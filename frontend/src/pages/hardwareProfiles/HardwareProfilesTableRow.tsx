import * as React from 'react';
import {
  Divider,
  Stack,
  StackItem,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { relativeTime } from '~/utilities/time';
import { TableRowTitleDescription } from '~/components/table';
import HardwareProfileEnableToggle from '~/pages/hardwareProfiles/HardwareProfileEnableToggle';
import { HardwareProfileKind } from '~/k8sTypes';
import NodeResourceTable from '~/pages/hardwareProfiles/nodeResource/NodeResourceTable';
import NodeSelectorTable from '~/pages/hardwareProfiles/nodeSelector/NodeSelectorTable';
import TolerationTable from '~/pages/hardwareProfiles/toleration/TolerationTable';
import { isHardwareProfileOOTB } from '~/pages/hardwareProfiles/utils';

type HardwareProfilesTableRowProps = {
  rowIndex: number;
  hardwareProfile: HardwareProfileKind;
  handleDelete: (cr: HardwareProfileKind) => void;
  refreshHardwareProfiles: () => void;
};

const HardwareProfilesTableRow: React.FC<HardwareProfilesTableRowProps> = ({
  hardwareProfile,
  rowIndex,
  handleDelete,
  refreshHardwareProfiles,
}) => {
  const modifiedDate = hardwareProfile.metadata.annotations?.['opendatahub.io/modified-date'];
  const [isExpanded, setExpanded] = React.useState(false);
  const navigate = useNavigate();

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr>
        <Td
          expand={{
            rowIndex,
            expandId: 'hardware-profile-table-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <Td dataLabel="Name">
          <TableRowTitleDescription
            title={hardwareProfile.spec.displayName}
            description={hardwareProfile.spec.description}
            resource={hardwareProfile}
            truncateDescriptionLines={2}
          />
        </Td>
        <Td dataLabel="Enabled">
          <HardwareProfileEnableToggle
            hardwareProfile={hardwareProfile}
            refreshHardwareProfiles={refreshHardwareProfiles}
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
              ...(isHardwareProfileOOTB(hardwareProfile)
                ? []
                : [
                    {
                      title: 'Edit',
                      onClick: () =>
                        navigate(`/hardwareProfiles/edit/${hardwareProfile.metadata.name}`),
                    },
                  ]),
              {
                title: 'Duplicate',
                onClick: () =>
                  navigate(`/hardwareProfiles/duplicate/${hardwareProfile.metadata.name}`),
              },
              ...(isHardwareProfileOOTB(hardwareProfile)
                ? []
                : [
                    { isSeparator: true },
                    {
                      title: 'Delete',
                      onClick: () => handleDelete(hardwareProfile),
                    },
                  ]),
            ]}
          />
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        <Td dataLabel="Other information" colSpan={4}>
          <ExpandableRowContent>
            <Stack hasGutter>
              {hardwareProfile.spec.identifiers &&
                hardwareProfile.spec.identifiers.length !== 0 && (
                  <StackItem>
                    <p className="pf-v6-u-font-weight-bold">Node resources</p>
                    <NodeResourceTable nodeResources={hardwareProfile.spec.identifiers} />
                    <Divider />
                  </StackItem>
                )}
              {hardwareProfile.spec.nodeSelectors &&
                hardwareProfile.spec.nodeSelectors.length !== 0 && (
                  <StackItem>
                    <p className="pf-v6-u-font-weight-bold">Node selectors</p>
                    <NodeSelectorTable nodeSelectors={hardwareProfile.spec.nodeSelectors} />
                    <Divider />
                  </StackItem>
                )}
              {hardwareProfile.spec.tolerations &&
                hardwareProfile.spec.tolerations.length !== 0 && (
                  <StackItem>
                    <p className="pf-v6-u-font-weight-bold">Tolerations</p>
                    <TolerationTable tolerations={hardwareProfile.spec.tolerations} />
                    <Divider />
                  </StackItem>
                )}
            </Stack>
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default HardwareProfilesTableRow;
