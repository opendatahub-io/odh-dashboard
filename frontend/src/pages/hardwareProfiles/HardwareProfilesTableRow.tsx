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
  Tooltip,
} from '@patternfly/react-core';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { relativeTime } from '~/utilities/time';
import { TableRowTitleDescription } from '~/components/table';
import HardwareProfileEnableToggle from '~/pages/hardwareProfiles/HardwareProfileEnableToggle';
import { HardwareProfileKind, HardwareProfileUseCases } from '~/k8sTypes';
import NodeResourceTable from '~/pages/hardwareProfiles/nodeResource/NodeResourceTable';
import NodeSelectorTable from '~/pages/hardwareProfiles/nodeSelector/NodeSelectorTable';
import TolerationTable from '~/pages/hardwareProfiles/toleration/TolerationTable';
import { useKebabAccessAllowed, verbModelAccess } from '~/concepts/userSSAR';
import {
  createHardwareProfileWarningTitle,
  validateProfileWarning,
} from '~/pages/hardwareProfiles/utils';
import { HardwareProfileModel } from '~/api';
import MigrationTooltip from './migration/MigrationTooltip';
import { MigrationAction } from './migration/types';
import { HardwareProfileUseCaseTitles } from './manage/const';

type HardwareProfilesTableRowProps = {
  rowIndex: number;
  hardwareProfile: HardwareProfileKind;
  migrationAction?: MigrationAction;
  handleDelete: (cr: HardwareProfileKind) => void;
  handleMigrate: (migrationAction: MigrationAction) => void;
};

const HardwareProfilesTableRow: React.FC<HardwareProfilesTableRowProps> = ({
  hardwareProfile,
  rowIndex,
  migrationAction,
  handleDelete,
  handleMigrate,
}) => {
  const modifiedDate = hardwareProfile.metadata.annotations?.['opendatahub.io/modified-date'];
  const [isExpanded, setExpanded] = React.useState(false);
  const navigate = useNavigate();

  const useCases: HardwareProfileUseCases[] = React.useMemo(() => {
    if (hardwareProfile.metadata.annotations?.['opendatahub.io/use-cases']) {
      try {
        return JSON.parse(hardwareProfile.metadata.annotations['opendatahub.io/use-cases']);
      } catch (error) {
        return [];
      }
    }
    return [];
  }, [hardwareProfile.metadata.annotations]);

  const title = migrationAction ? (
    <MigrationTooltip
      migrationAction={migrationAction}
      wrap={false}
      onMigrate={() => handleMigrate(migrationAction)}
    >
      <Truncate content={hardwareProfile.spec.displayName} />
    </MigrationTooltip>
  ) : (
    <Truncate content={hardwareProfile.spec.displayName} />
  );
  const hardwareProfileWarnings = validateProfileWarning(hardwareProfile);

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
            title={title}
            description={hardwareProfile.spec.description}
            resource={migrationAction ? undefined : hardwareProfile}
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
        <Td dataLabel="Use cases">
          {useCases.length === 0 ? (
            <i>All use cases</i>
          ) : (
            <LabelGroup>
              {useCases.map((v) => (
                <Label key={v}>{HardwareProfileUseCaseTitles[v]}</Label>
              ))}
            </LabelGroup>
          )}
        </Td>
        <Td dataLabel="Enabled">
          {migrationAction ? (
            <Tooltip content="This proposed profile requires migration before it can be modified.">
              <span>{hardwareProfile.spec.enabled ? 'Enabled' : 'Disabled'}</span>
            </Tooltip>
          ) : (
            <HardwareProfileEnableToggle hardwareProfile={hardwareProfile} />
          )}
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
                migrationAction
                  ? [{ title: 'Migrate', onClick: () => handleMigrate(migrationAction) }]
                  : [],
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
              {hardwareProfile.spec.nodeSelector &&
                Object.keys(hardwareProfile.spec.nodeSelector).length !== 0 && (
                  <StackItem>
                    <p className="pf-v6-u-font-weight-bold">Node selectors</p>
                    <NodeSelectorTable nodeSelector={hardwareProfile.spec.nodeSelector} />
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
