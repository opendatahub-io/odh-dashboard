import {
  Button,
  Label,
  LabelGroup,
  Modal,
  ModalVariant,
  Popover,
  SearchInput,
  Text,
} from '@patternfly/react-core';
import React from 'react';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import { getRegisteredModelLabels } from './utils';

type RegisteredModelLabelsProps = {
  rmName: string;
  customProperties: RegisteredModel['customProperties'];
};

const RegisteredModelLabels: React.FC<RegisteredModelLabelsProps> = ({
  rmName,
  customProperties,
}) => {
  const rmLabels = React.useMemo(
    () => getRegisteredModelLabels(customProperties),
    [customProperties],
  );
  const [filteredLabels, setFilteredLabels] = React.useState<string[]>([]);
  const [isLabelModalOpen, setIsLabelModalOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  const doSetSearchDebounced = useDebounceCallback(setSearchValue);

  React.useEffect(() => {
    setFilteredLabels(
      rmLabels.filter((label) => label.toLowerCase().includes(searchValue.toLowerCase())),
    );
  }, [rmLabels, searchValue]);

  const labelsComponent = (labels: string[], textMaxWidth?: string) =>
    labels.map((label, index) => (
      <Label color="blue" textMaxWidth={textMaxWidth || '40ch'} key={index}>
        {label}
      </Label>
    ));

  const getLabelComponent = (labels: JSX.Element[]) => {
    const labelCount = labels.length;
    if (labelCount) {
      return labelCount > 7 ? getLabelModal(labelCount) : getLabelPopover(labelCount, labels);
    }
    return null;
  };

  const getLabelPopover = (labelCount: number, labels: JSX.Element[]) => (
    <Popover bodyContent={<LabelGroup numLabels={labelCount}>{labels}</LabelGroup>}>
      <Label isOverflowLabel>{labelCount} more</Label>
    </Popover>
  );

  const getLabelModal = (labelCount: number) => (
    <Label isOverflowLabel onClick={() => setIsLabelModalOpen(true)}>
      {labelCount} more
    </Label>
  );

  const labelModal = (
    <Modal
      variant={ModalVariant.small}
      title="Labels"
      isOpen={isLabelModalOpen}
      onClose={() => setIsLabelModalOpen(false)}
      description={
        <Text>
          The following are all the labels of <strong>{rmName}</strong>
        </Text>
      }
      actions={[
        <Button key="close" variant="primary" onClick={() => setIsLabelModalOpen(false)}>
          Close
        </Button>,
      ]}
    >
      <SearchInput
        placeholder="Find a label"
        value={searchValue}
        onChange={(_event, value) => doSetSearchDebounced(value)}
        onClear={() => setSearchValue('')}
      />
      <br />
      <LabelGroup numLabels={rmLabels.length}>{labelsComponent(filteredLabels, '50ch')}</LabelGroup>
    </Modal>
  );

  if (Object.keys(customProperties).length === 0) {
    return '-';
  }

  return (
    <>
      <LabelGroup numLabels={4}>
        {labelsComponent(rmLabels.slice(0, 3))}
        {getLabelComponent(labelsComponent(rmLabels.slice(3)))}
      </LabelGroup>
      {labelModal}
    </>
  );
};

export default RegisteredModelLabels;
