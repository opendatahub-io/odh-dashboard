import * as React from 'react';
import {
  Label,
  LabelGroup,
  Icon,
  List,
  ListItem,
  Popover,
  Timestamp,
  TimestampTooltipVariant,
  Truncate,
} from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { relativeTime } from '#~/utilities/time';
import { TableRowTitleDescription } from '#~/components/table';
import HardwareProfileEnableToggle from '#~/pages/hardwareProfiles/HardwareProfileEnableToggle';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '#~/k8sTypes';
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
  hardwareProfile: HardwareProfileKind;
  handleDelete: (cr: HardwareProfileKind) => void;
};

const HardwareProfilesTableRow: React.FC<HardwareProfilesTableRowProps> = ({
  hardwareProfile,
  handleDelete,
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

  return (
    <>
      <Tr key={hardwareProfile.metadata.name} id={hardwareProfile.metadata.name}>
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
    </>
  );
};

export default HardwareProfilesTableRow;
