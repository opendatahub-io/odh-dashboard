import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  DescriptionList,
  Timestamp,
  TimestampTooltipVariant,
  Truncate,
} from '@patternfly/react-core';
import { BYONImage } from '#~/types';
import { relativeTime } from '#~/utilities/time';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import { FetchState } from '#~/utilities/useFetchState';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import BYONImageHardwareProfiles from '#~/pages/BYONImages/BYONImageHardwareProfiles';
import { TableRowTitleDescription } from '#~/components/table';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';
import ImageErrorStatus from './ImageErrorStatus';
import BYONImageStatusToggle from './BYONImageStatusToggle';
import { convertBYONImageToK8sResource } from './utils';
import BYONImageDependenciesList from './BYONImageDependenciesList';
import { BYONImageAccelerators } from './BYONImageAccelerators';

type BYONImagesTableRowProps = {
  obj: BYONImage;
  rowIndex: number;
  acceleratorProfiles: FetchState<AcceleratorProfileKind[]>;
  hardwareProfiles: ReturnType<typeof useHardwareProfilesByFeatureVisibility>;
  onEditImage: (obj: BYONImage) => void;
  onDeleteImage: (obj: BYONImage) => void;
};

const BYONImagesTableRow: React.FC<BYONImagesTableRowProps> = ({
  obj,
  rowIndex,
  acceleratorProfiles,
  hardwareProfiles,
  onEditImage,
  onDeleteImage,
}) => {
  const isHardwareProfileAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const [isExpanded, setExpanded] = React.useState(false);
  const columnModifier =
    obj.software.length > 0 && obj.packages.length > 0
      ? '3Col'
      : obj.software.length === 0 && obj.packages.length === 0
      ? '1Col'
      : '2Col';

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr>
        <Td
          expand={{
            rowIndex,
            expandId: 'byon-image-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <Td dataLabel="Name">
          <TableRowTitleDescription
            title={<Truncate content={obj.display_name} />}
            resource={convertBYONImageToK8sResource(obj)}
            description={obj.description}
            truncateDescriptionLines={2}
            titleIcon={<ImageErrorStatus image={obj} />}
            wrapResourceTitle={false}
          />
        </Td>
        <Td dataLabel="Enable" modifier="nowrap">
          <BYONImageStatusToggle image={obj} />
        </Td>
        {isHardwareProfileAvailable ? (
          <Td dataLabel="Recommended hardware profiles">
            <BYONImageHardwareProfiles image={obj} hardwareProfiles={hardwareProfiles} />
          </Td>
        ) : (
          <Td dataLabel="Recommended accelerators">
            <BYONImageAccelerators image={obj} acceleratorProfiles={acceleratorProfiles} />
          </Td>
        )}
        <Td dataLabel="Provider">{obj.provider}</Td>
        <Td dataLabel="Imported">
          <span style={{ whiteSpace: 'nowrap' }}>
            <Timestamp
              date={new Date(obj.imported_time)}
              tooltip={{
                variant: TimestampTooltipVariant.default,
              }}
            >
              {relativeTime(Date.now(), new Date(obj.imported_time).getTime())}
            </Timestamp>
          </span>
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'Edit',
                id: `${obj.name}-edit-button`,
                onClick: () => {
                  onEditImage(obj);
                },
              },
              {
                isSeparator: true,
              },
              {
                title: 'Delete',
                id: `${obj.name}-delete-button`,
                onClick: () => {
                  onDeleteImage(obj);
                },
              },
            ]}
          />
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        <Td dataLabel="Other information" colSpan={6}>
          <ExpandableRowContent>
            <DescriptionList columnModifier={{ default: columnModifier }}>
              <BYONImageDependenciesList
                data-testid="displayed-software"
                term="Displayed software"
                dependencies={obj.software.map((s) => `${s.name} ${s.version}`)}
              />
              <BYONImageDependenciesList
                term="Displayed packages"
                data-testid="displayed-packages"
                dependencies={obj.packages.map((p) => `${p.name} ${p.version}`)}
              />
              <BYONImageDependenciesList term="Image location" dependencies={[obj.url]} />
            </DescriptionList>
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default BYONImagesTableRow;
