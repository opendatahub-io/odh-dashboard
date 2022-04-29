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
  SelectVariant,
  TextInput,
  Title,
} from '@patternfly/react-core';
import {
  CONNECTED_MODEL,
  NotebookList,
  PersistentVolumeClaim,
  PersistentVolumeClaimList,
  Project,
  Secret,
  SecretList,
} from 'types';
import ConnectedModelCard from '../components/ConnectedModelCard';
import { modelTypeDisplayNames } from '../../../utilities/servingUtils';
import { createPredictor } from '../../../services/predictorService';

type ModelServingModalProps = {
  project: Project | undefined;
  notebookList: NotebookList | undefined;
  pvcList: PersistentVolumeClaimList | undefined;
  objectStorageList: SecretList | undefined;
  isModalOpen: boolean;
  onClose: () => void;
  dispatchError: (e: Error, title: string) => void;
};

const ModelServingModal: React.FC<ModelServingModalProps> = React.memo(
  ({ project, notebookList, pvcList, objectStorageList, isModalOpen, onClose, dispatchError }) => {
    const [connectedModel, setConnectedModel] = React.useState('');

    const [isPvcSelectOpen, setPvcSelectOpen] = React.useState(false);
    const [selectedPvc, setSelectedPvc] = React.useState<PersistentVolumeClaim | undefined>(
      undefined,
    );
    const [pvcPath, setPvcPath] = React.useState('');

    const [isObjectStoreSelectOpen, setObjectStoreSelectOpen] = React.useState(false);
    const [selectedObjectStore, setSelectedObjectStore] = React.useState<Secret | undefined>(
      undefined,
    );
    const [objectStoreBucket, setObjectStoreBucket] = React.useState('');
    const [objectKey, setObjectKey] = React.useState('');

    const [modelName, setModelName] = React.useState('');
    const [modelTypeDropdownOpen, setModelTypeDropdownOpen] = React.useState(false);
    const [modelType, setModelType] = React.useState('');

    const [createInProgress, setCreateInProgress] = React.useState(false);

    const validate = () => {
      if (!connectedModel) return false;

      if (connectedModel === 's3') {
        if (!selectedObjectStore) return false;
        if (!objectKey) return false;
      }

      if (connectedModel === 'pv') {
        return false; //PV not supported yet
        // if (!selectedPvc) return false;
        // if (!pvcPath) return false;
      }

      if (!modelName) return false;
      if (!modelType) return false;

      return true;
    };

    const isDisabled = createInProgress || !validate();

    const pvcSelectOptions = pvcList?.items.map((pvc, index) => (
      <SelectOption key={index + 1} value={pvc.metadata.name} />
    ));
    const objectStoreSelectOptions = objectStorageList?.items.map((os, index) => (
      <SelectOption key={index + 1} value={os.metadata.name} />
    ));

    React.useEffect(() => {
      init();
      // if (predictor) {
      // }
    }, [isModalOpen]);

    React.useEffect(() => {}, []);

    const init = () => {
      setConnectedModel('');
      setPvcSelectOpen(false);
      setSelectedPvc(undefined);
      setPvcPath('');
      setObjectStoreSelectOpen(false);
      setSelectedObjectStore(undefined);
      setObjectStoreBucket('');
      setObjectKey('');
      setModelName('');
      setModelTypeDropdownOpen(false);
      setModelType('');
      setCreateInProgress(false);
    };

    React.useEffect(() => {
      setConnectedModel('');
    }, []);

    const handlePvcSelection = (e, value) => {
      if (value === 'None') {
        setSelectedPvc(undefined);
      } else {
        const selected = pvcList?.items.find((pvc) => pvc.metadata.name === value);
        setSelectedPvc(selected);
      }
      setPvcSelectOpen(false);
    };

    const handleObjectStoreSelection = (e, value) => {
      if (value === 'None') {
        setSelectedObjectStore(undefined);
      } else {
        const selected = objectStorageList?.items.find((os) => os.metadata.name === value);
        setSelectedObjectStore(selected);
      }
      setObjectStoreSelectOpen(false);
    };

    const modelTypeOptions: JSX.Element[] = [];
    for (const [key, value] of Object.entries(modelTypeDisplayNames)) {
      modelTypeOptions.push(
        <SelectOption id={key} key={key} value={key}>
          {value}
        </SelectOption>,
      );
    }

    const handleConnectedModelSelection = (event: React.MouseEvent) => {
      const { id } = event.currentTarget;
      const newSelected = id === connectedModel ? '' : id;
      setConnectedModel(newSelected);
      setModelName('');
      setModelType('');
    };

    const handleModelEngineSelection = (event, selection) => {
      setModelType(selection);
      setModelTypeDropdownOpen(false);
    };

    const handleServeAction = () => {
      if (!project) return;
      if (connectedModel === 's3') {
        if (!selectedObjectStore) return;
        setCreateInProgress(true);
        createPredictor(
          project.metadata.name,
          modelName,
          modelType,
          objectKey,
          selectedObjectStore.metadata.name,
        )
          .then(() => {
            setCreateInProgress(false);
            onClose();
          })
          .catch((e) => {
            setCreateInProgress(false);
            dispatchError(e, 'Error serving model');
            onClose();
          });
      }
    };

    const renderPvcForm = () => {
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
          <FormGroup fieldId="model-type" label="Model Type">
            <Select
              isOpen={modelTypeDropdownOpen}
              onToggle={() => setModelTypeDropdownOpen(!modelTypeDropdownOpen)}
              aria-labelledby="model-serving-engine-dropdown"
              placeholderText="Choose one"
              selections={modelType}
              onSelect={handleModelEngineSelection}
              menuAppendTo="parent"
            >
              {modelTypeOptions}
            </Select>
          </FormGroup>
          <FormGroup label="Persistent Volume Claim" fieldId="pvc">
            <Select
              id="model-serving-pvc-input"
              variant={SelectVariant.single}
              aria-label="Select VC"
              onToggle={() => setPvcSelectOpen(!isPvcSelectOpen)}
              onSelect={handlePvcSelection}
              selections={selectedPvc?.metadata.name || 'None'}
              isOpen={isPvcSelectOpen}
              // isDisabled={isDisabled}
              // direction={direction}
              label="Workspace"
            >
              {pvcSelectOptions}
            </Select>
          </FormGroup>
          <FormGroup fieldId="pv-mount-location" label="Path">
            <TextInput
              id="model-serving-pvc-path-input"
              name="model-serving-pvc-path-input"
              value={pvcPath}
              onChange={(value) => {
                setPvcPath(value);
              }}
              isDisabled={!selectedPvc}
            />
          </FormGroup>
        </>
      );
    };

    const renderS3Form = () => {
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
          <FormGroup fieldId="model-type" label="Model Type">
            <Select
              isOpen={modelTypeDropdownOpen}
              onToggle={() => setModelTypeDropdownOpen(!modelTypeDropdownOpen)}
              aria-labelledby="model-serving-engine-dropdown"
              placeholderText="Choose one"
              selections={modelType}
              onSelect={handleModelEngineSelection}
              menuAppendTo="parent"
            >
              {modelTypeOptions}
            </Select>
          </FormGroup>
          <FormGroup label="Object Store" fieldId="object store">
            <Select
              variant={SelectVariant.single}
              aria-label="Select Object Store"
              onToggle={() => setObjectStoreSelectOpen(!isObjectStoreSelectOpen)}
              onSelect={handleObjectStoreSelection}
              selections={selectedObjectStore?.metadata.name || 'None'}
              isOpen={isObjectStoreSelectOpen}
              label="Workspace"
            >
              {objectStoreSelectOptions}
            </Select>
          </FormGroup>
          <FormGroup fieldId="object-store-key" label="Object Key">
            <TextInput
              id="object-store-key-input"
              name="object-store-key-input"
              value={objectKey}
              onChange={(value) => {
                setObjectKey(value);
              }}
              isDisabled={!selectedObjectStore}
            />
          </FormGroup>
        </>
      );
    };

    const renderForm = () => {
      switch (connectedModel) {
        case CONNECTED_MODEL.s3:
          return renderS3Form();
        case CONNECTED_MODEL.persistentVolume:
          return renderPvcForm();
        default:
          return null;
      }
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
          <Button key="Serve" variant="primary" isDisabled={isDisabled} onClick={handleServeAction}>
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
