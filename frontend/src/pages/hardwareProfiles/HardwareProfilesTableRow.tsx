import * as React from 'react';
import {
  Divider,
  Label,
  LabelGroup,
  Icon,
  List,
  ListItem,
  Popover,
  Stack,
  StackItem,
  Timestamp,
  TimestampTooltipVariant,
  Truncate,
} from '@patternfly/react-core';
import { ActionsColumn, ExpandableRowContent, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { relativeTime } from '#~/utilities/time';
import { TableRowTitleDescription } from '#~/components/table';
import HardwareProfileEnableToggle from '#~/pages/hardwareProfiles/HardwareProfileEnableToggle';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import NodeResourceTable from '#~/pages/hardwareProfiles/nodeResource/NodeResourceTable';
import NodeSelectorTable from '#~/pages/hardwareProfiles/nodeSelector/NodeSelectorTable';
import TolerationTable from '#~/pages/hardwareProfiles/toleration/TolerationTable';
import { useKebabAccessAllowed, verbModelAccess } from '#~/concepts/userSSAR';
import {
  createHardwareProfileWarningTitle,
  getHardwareProfileDescription,
  getHardwareProfileDisplayName,
  validateProfileWarning,
} from '#~/pages/hardwareProfiles/utils';
import { HardwareProfileModel } from '#~/api';
import { HardwareProfileFeatureVisibilityTitles } from './manage/const';

type HardwareProfilesTableRowProps = {
  rowIndex: number;
  hardwareProfile: HardwareProfileKind;
  handleDelete: (cr: HardwareProfileKind) => void;
  isExpanded: boolean;
  onToggleExpansion: () => void;
};

const HardwareProfilesTableRow: React.FC<HardwareProfilesTableRowProps> = ({
  hardwareProfile,
  rowIndex,
  handleDelete,
  isExpanded,
  onToggleExpansion,
  ...props
}) => {
  const modifiedDate = hardwareProfile.metadata.annotations?.['opendatahub.io/modified-date'];
  const navigate = useNavigate();

  const useCases: HardwareProfileFeatureVisibility[] = React.useMemo(() => {
    if (hardwareProfile.metadata.annotations?.['opendatahub.io/dashboard-feature-visibility']) {
      try {
        return JSON.parse(
          hardwareProfile.metadata.annotations['opendatahub.io/dashboard-feature-visibility'],
        );
      } catch (error) {
        return [];
      }
    }
    return [];
  }, [hardwareProfile.metadata.annotations]);

  const hardwareProfileWarnings = validateProfileWarning(hardwareProfile);

  const { kueue, node } = hardwareProfile.spec.scheduling ?? {};
  const localQueueName = kueue?.localQueueName;
  const priorityClass = kueue?.priorityClass;
  const nodeSelector = node?.nodeSelector;
  const tolerations = node?.tolerations;

  return (
    <>
      <Tr
        key={hardwareProfile.metadata.name}
        id={hardwareProfile.metadata.name}
        draggable
        {...props}
      >
        <Td
          expand={{
            rowIndex,
            expandId: `hardware-profile-${hardwareProfile.metadata.name}`,
            isExpanded,
            onToggle: onToggleExpansion,
          }}
        />
        <Td
          draggableRow={{
            id: `draggable-row-${hardwareProfile.metadata.name}`,
          }}
        />
        <Td dataLabel="Name">
          <TableRowTitleDescription
            title={<Truncate content={getHardwareProfileDisplayName(hardwareProfile)} />}
            description={getHardwareProfileDescription(hardwareProfile)}
            resource={hardwareProfile}
            truncateDescriptionLines={2}
            wrapResourceTitle={false}
            titleIcon={
              hardwareProfileWarnings.length > 0 && (
                <Popover
                  hasAutoWidth
                  headerIcon={
                    <Icon status="warning">
                      <ExclamationTriangleIcon />
                    </Icon>
                  }
                  headerContent={createHardwareProfileWarningTitle(hardwareProfile)}
                  bodyContent={() => (
                    <>
                      {hardwareProfileWarnings.length === 1 ? (
                        <div>{hardwareProfileWarnings[0].message}</div>
                      ) : (
                        <List>
                          {hardwareProfileWarnings.map((warning, index) => (
                            <ListItem key={index}>{warning.message}</ListItem>
                          ))}
                        </List>
                      )}
                    </>
                  )}
                >
                  <Icon status="warning" data-testid="icon-warning">
                    <ExclamationTriangleIcon />
                  </Icon>
                </Popover>
              )
            }
          />
        </Td>
        <Td dataLabel="Features">
          {useCases.length === 0 ? (
            <i>All features</i>
          ) : (
            <LabelGroup>
              {useCases.map((v) => (
                <Label key={v} data-testid={`label-${v}`}>
                  {HardwareProfileFeatureVisibilityTitles[v]}
                </Label>
              ))}
            </LabelGroup>
          )}
        </Td>
        <Td dataLabel="Enabled">
          <HardwareProfileEnableToggle hardwareProfile={hardwareProfile} />
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
              ...useKebabAccessAllowed(
                [
                  {
                    title: 'Edit',
                    onClick: () =>
                      navigate(`/hardwareProfiles/edit/${hardwareProfile.metadata.name}`),
                  },
                ],
                verbModelAccess('update', HardwareProfileModel),
              ),
              ...useKebabAccessAllowed(
                [
                  {
                    title: 'Duplicate',
                    onClick: () =>
                      navigate(`/hardwareProfiles/duplicate/${hardwareProfile.metadata.name}`),
                  },
                ],
                verbModelAccess('create', HardwareProfileModel),
              ),
              ...useKebabAccessAllowed(
                [
                  { isSeparator: true },
                  {
                    title: 'Delete',
                    onClick: () => handleDelete(hardwareProfile),
                  },
                ],
                verbModelAccess('delete', HardwareProfileModel),
              ),
            ]}
          />
        </Td>
      </Tr>
      {isExpanded && (
        <Tr key={`${hardwareProfile.metadata.name}-expanded`} isExpanded={isExpanded}>
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
                {localQueueName && (
                  <StackItem>
                    <p className="pf-v6-u-font-weight-bold">Local queue</p>
                    {localQueueName}
                  </StackItem>
                )}
                {priorityClass && (
                  <StackItem>
                    <p className="pf-v6-u-font-weight-bold">Workload priority</p>
                    {priorityClass}
                  </StackItem>
                )}
                {nodeSelector && Object.keys(nodeSelector).length !== 0 && (
                  <StackItem>
                    <p className="pf-v6-u-font-weight-bold">Node selectors</p>
                    <NodeSelectorTable nodeSelector={nodeSelector} />
                    <Divider />
                  </StackItem>
                )}
                {tolerations && tolerations.length !== 0 && (
                  <StackItem>
                    <p className="pf-v6-u-font-weight-bold">Tolerations</p>
                    <TolerationTable tolerations={tolerations} />
                    <Divider />
                  </StackItem>
                )}
              </Stack>
            </ExpandableRowContent>
          </Td>
        </Tr>
      )}
    </>
  );
};

export default HardwareProfilesTableRow;
