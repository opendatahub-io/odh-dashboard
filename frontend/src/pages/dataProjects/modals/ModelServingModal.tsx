import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  Select,
  SelectOption,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { CONNECTED_MODEL, NotebookList, Project } from 'types';
import ConnectedModelCard from '../components/ConnectedModelCard';

type ModelServingModalProps = {
  project: Project | undefined;
  notebookList: NotebookList | undefined;
  isModalOpen: boolean;
  onClose: () => void;
  dispatchError: (e: Error, title: string) => void;
};

const ModelServingModal: React.FC<ModelServingModalProps> = React.memo(
  ({ project, notebookList, isModalOpen, onClose, dispatchError }) => {
    const [connectedModel, setConnectedModel] = React.useState('');
    const [modelName, setModelName] = React.useState('');
    const [modelEngineDropdownOpen, setModelEngineDropdownOpen] = React.useState(false);
    const [modelEngine, setModelEngine] = React.useState('');

    const nameInputRef = React.useRef<HTMLInputElement>(null);

    const validate = () => {
      if (connectedModel) {
        return true;
      }
      return false;
    };

    const isDisabled = !validate();

    React.useEffect(() => {
      if (isModalOpen && nameInputRef && nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, [isModalOpen]);

    React.useEffect(() => {
      setConnectedModel('');
    }, []);

    const modelEngineOptions = [
      <SelectOption id="engine1" key="engine1" value="engine1">
        Engine1
      </SelectOption>,
      <SelectOption id="engine2" key="engine2" value="engine2">
        Engine2
      </SelectOption>,
      <SelectOption id="engine3" key="engine3" value="engine3">
        Engine3
      </SelectOption>,
    ];

    const handleConnectedModelSelection = (event: React.MouseEvent) => {
      const { id } = event.currentTarget;
      const newSelected = id === connectedModel ? '' : id;
      setConnectedModel(newSelected);
      setModelName('');
      setModelEngine('');
    };

    const handleModelEngineSelection = (event, selection) => {
      setModelEngine(selection);
      setModelEngineDropdownOpen(false);
    };

    const renderForm = () => {
      if (!connectedModel) {
        return null;
      }
      return (
        <>
          <FormGroup fieldId="model-serving-name" label="Model name">
            <TextInput
              id="model-serving-name-input"
              name="model-serving-name-input"
              value={modelName}
              onChange={(value) => setModelName(value)}
            />
          </FormGroup>
          <FormGroup fieldId="model-serving-engine" label="Serving engine">
            <Select
              isOpen={modelEngineDropdownOpen}
              onToggle={() => setModelEngineDropdownOpen(!modelEngineDropdownOpen)}
              aria-labelledby="model-serving-engine-dropdown"
              placeholderText="Choose one"
              selections={modelEngine}
              onSelect={handleModelEngineSelection}
              menuAppendTo="parent"
            >
              {modelEngineOptions}
            </Select>
          </FormGroup>
        </>
      );
    };

    return (
      <Modal
        aria-label={`Serve ${project?.metadata.name}`}
        className="odh-data-projects__modal"
        variant={ModalVariant.large}
        title={`Serve ${project?.metadata.name}`}
        description="Configure properties for serving your data project."
        isOpen={isModalOpen}
        onClose={onClose}
        actions={[
          <Button key="Serve" variant="primary" isDisabled={isDisabled} onClick={() => {}}>
            Serve
          </Button>,
          <Button key="cancel" variant="secondary" onClick={onClose}>
            Cancel
          </Button>,
        ]}
      >
        <Title headingLevel="h3" size="lg" className="odh-data-projects__modal-title">
          {connectedModel ? 'Connected model' : 'Choose a connected model'}
        </Title>
        <Form className="odh-data-projects__modal-form">
          <FormGroup fieldId="modal-model-serving-connected-model">
            <Flex>
              {[CONNECTED_MODEL.persistentVolume, CONNECTED_MODEL.s3].map((cm) => (
                <FlexItem key={cm}>
                  <ConnectedModelCard
                    connectedModel={cm}
                    isSelected={cm === connectedModel}
                    onSelect={handleConnectedModelSelection}
                  />
                </FlexItem>
              ))}
            </Flex>
          </FormGroup>
          {renderForm()}
        </Form>
      </Modal>
    );
  },
);

ModelServingModal.displayName = 'ModelServingModal';

export default ModelServingModal;
