import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  DescriptionList,
  Flex,
  FlexItem,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { BYONImage } from '~/types';
import { relativeTime } from '~/utilities/time';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import { AcceleratorProfileKind } from '~/k8sTypes';
import { FetchState } from '~/utilities/useFetchState';
import ImageErrorStatus from './ImageErrorStatus';
import BYONImageStatusToggle from './BYONImageStatusToggle';
import { convertBYONImageToK8sResource } from './utils';
import BYONImageDependenciesList from './BYONImageDependenciesList';
import { BYONImageAccelerators } from './BYONImageAccelerators';

type BYONImagesTableRowProps = {
  obj: BYONImage;
  rowIndex: number;
  acceleratorProfiles: FetchState<AcceleratorProfileKind[]>;
  onEditImage: (obj: BYONImage) => void;
  onDeleteImage: (obj: BYONImage) => void;
};

const BYONImagesTableRow: React.FC<BYONImagesTableRowProps> = ({
  obj,
  rowIndex,
  acceleratorProfiles,
  onEditImage,
  onDeleteImage,
}) => {
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
        <Td dataLabel="Name" modifier="nowrap">
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <ResourceNameTooltip resource={convertBYONImageToK8sResource(obj)}>
                {obj.display_name}
              </ResourceNameTooltip>
            </FlexItem>
            <FlexItem>
              <ImageErrorStatus image={obj} />
            </FlexItem>
          </Flex>
        </Td>
        <Td dataLabel="Description" modifier="breakWord">
          {obj.description}
        </Td>
        <Td dataLabel="Enable" modifier="nowrap">
          <BYONImageStatusToggle image={obj} />
        </Td>
        <Td dataLabel="Accelerators">
          <BYONImageAccelerators image={obj} acceleratorProfiles={acceleratorProfiles} />
        </Td>
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
