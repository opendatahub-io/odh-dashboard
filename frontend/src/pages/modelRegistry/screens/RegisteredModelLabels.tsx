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

// Threshold count to decide whether to choose modal or popover
const MODAL_THRESHOLD = 4;

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
      <Label color="blue" data-testid="label" textMaxWidth={textMaxWidth || '40ch'} key={index}>
        {label}
      </Label>
    ));

  const getLabelComponent = (labels: JSX.Element[]) => {
    const labelCount = labels.length;
    if (labelCount) {
      return labelCount > MODAL_THRESHOLD
        ? getLabelModal(labelCount)
        : getLabelPopover(labelCount, labels);
    }
    return null;
  };

  const getLabelPopover = (labelCount: number, labels: JSX.Element[]) => (
    <Popover
      bodyContent={
        <LabelGroup data-testid="popover-label-group" numLabels={labelCount}>
          {labels}
        </LabelGroup>
      }
    >
      <Label data-testid="popover-label-text" isOverflowLabel>
        {labelCount} more
      </Label>
    </Popover>
  );

  const getLabelModal = (labelCount: number) => (
    <Label data-testid="modal-label-text" isOverflowLabel onClick={() => setIsLabelModalOpen(true)}>
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
        <Button
          data-testid="close-modal"
          key="close"
          variant="primary"
          onClick={() => setIsLabelModalOpen(false)}
        >
          Close
        </Button>,
      ]}
    >
      <SearchInput
        aria-label="Label modal search"
        data-testid="label-modal-search"
        placeholder="Find a label"
        value={searchValue}
        onChange={(_event, value) => doSetSearchDebounced(value)}
        onClear={() => setSearchValue('')}
      />
      <br />
      <LabelGroup data-testid="modal-label-group" numLabels={rmLabels.length}>
        {labelsComponent(filteredLabels, '50ch')}
      </LabelGroup>
    </Modal>
  );

  if (Object.keys(customProperties).length === 0) {
    return '-';
  }

  return (
    <>
      <LabelGroup numLabels={MODAL_THRESHOLD}>
        {labelsComponent(rmLabels.slice(0, 3))}
        {getLabelComponent(labelsComponent(rmLabels.slice(3)))}
      </LabelGroup>
      {labelModal}
    </>
  );
};

export default RegisteredModelLabels;
