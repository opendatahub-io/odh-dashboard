import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  InputGroup,
  Modal,
  ModalVariant,
  NumberInput,
  Select,
  SelectOption,
  SelectVariant,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { Container, Notebook, NotebookList, Project, StorageClassList, Volume } from 'types';
import { createPvc } from '../../../services/storageService';
import { ANNOTATION_STORAGE_CLASS_DEFAULT } from '../../../utilities/const';
import { patchNotebook } from '../../../services/notebookService';

type StorageModalProps = {
  project: Project | undefined;
  notebookList: NotebookList | undefined;
  storageClassList: StorageClassList | undefined;
  isModalOpen: boolean;
  onClose: () => void;
  storage: any;
};

const StorageModal: React.FC<StorageModalProps> = React.memo(
  ({ project, notebookList, storageClassList, storage, isModalOpen, onClose }) => {
    const action = storage ? 'Edit' : 'Add';
    // PV states
    const [pvName, setPvName] = React.useState('');
    const [pvDescription, setPvDescription] = React.useState('');
    const [isConnectToAllEnvChecked, setConnectToAllEnvChecked] = React.useState(true);
    const [isNotebookSelectOpen, setIsNotebookSelectOpen] = React.useState(false);
    const [selectedNotebook, setSelectedNotebook] = React.useState<Notebook | undefined>(undefined);
    const [mountPath, setMountPath] = React.useState('');
    const [isMountPathEdited, setIsMountPathEdited] = React.useState(false);
    const [pvSize, setPvSize] = React.useState(1);

    const nameInputRef = React.useRef<HTMLInputElement>(null);
    const validate = () => pvName && pvSize && pvSize > 0;
    const isDisabled = !validate();
    let notebookSelectOptions = [<SelectOption key={0} value="None" />];

    if (notebookList?.items?.length) {
      notebookSelectOptions = notebookSelectOptions.concat(
        notebookList?.items?.map((notebook, index) => (
          <SelectOption key={index + 1} value={notebook.metadata.name} />
        )),
      );
    }

    React.useEffect(() => {
      if (isModalOpen && action === 'Add') {
        init();
      }
      if (isModalOpen && nameInputRef && nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, [isModalOpen]);

    React.useEffect(() => {
      if (selectedNotebook === undefined) {
        setMountPath('');
      } else if (!isMountPathEdited) {
        setMountPath(`/home/storage/${pvName}`);
      }
    }, [pvName, selectedNotebook]);

    React.useEffect(() => {
      init();
      if (storage) {
        setPvName(storage.name);
        setPvDescription(storage.description);
        setPvSize(storage.size);
        setConnectToAllEnvChecked(storage.allEnvironmentsConnections);
      }
    }, [storage]);

    React.useEffect(() => {}, []);

    const init = () => {
      setPvName('');
      setPvDescription('');
      setConnectToAllEnvChecked(true);
      setPvSize(1);
      setMountPath('');
      setIsMountPathEdited(false);
    };

    const addPvc = () => {
      const defaultStorageClass = storageClassList?.items.find(
        (sc) => sc.metadata?.annotations?.[ANNOTATION_STORAGE_CLASS_DEFAULT] === 'true',
      );

      if (project && defaultStorageClass) {
        createPvc(project.metadata.name, pvName, pvDescription, pvSize + 'Gi').then(onClose);

        if (!selectedNotebook || !mountPath) {
          return;
        }

        const containers: Container[] = selectedNotebook.spec?.template?.spec?.containers || [];
        const volumes: Volume[] = selectedNotebook.spec?.template?.spec?.volumes || [];
        const notebookContainer: Container | undefined = containers.find(
          (container) => container.name === selectedNotebook.metadata.name,
        );

        if (!notebookContainer) {
          return;
        }
        notebookContainer.volumeMounts.push({ mountPath, name: pvName });
        volumes.push({ name: pvName, persistentVolumeClaim: { claimName: pvName } });

        const updateData = {
          spec: {
            template: {
              spec: {
                containers,
                volumes,
              },
            },
          },
        };
        patchNotebook(project.metadata.name, selectedNotebook.metadata.name, updateData);
      }
    };

    const handleNotebookSelection = (e, value, isPlaceholder) => {
      if (value === 'None') {
        setSelectedNotebook(undefined);
      } else {
        const selected = notebookList?.items.find((nb) => nb.metadata.name === value);
        setSelectedNotebook(selected);
      }
      setIsNotebookSelectOpen(false);
    };

    const handleDataAction = () => {
      addPvc();
    };

    return (
      <Modal
        aria-label={`${action} data`}
        className="odh-data-projects__modal"
        variant={ModalVariant.large}
        title={`${action} storage`}
        // description="Select options for your persistent volume."
        isOpen={isModalOpen}
        onClose={onClose}
        actions={[
          <Button
            key={action.toLowerCase()}
            variant="primary"
            isDisabled={isDisabled}
            onClick={handleDataAction}
          >
            {`${action} storage`}
          </Button>,
          <Button key="cancel" variant="secondary" onClick={onClose}>
            Cancel
          </Button>,
        ]}
      >
        <Title headingLevel="h3" size="lg" className="odh-data-projects__modal-title">
          Select options for your persistent volume:
        </Title>
        <Form className="odh-data-projects__modal-form">
          <FormGroup fieldId="new-pv-name" label="Name">
            <TextInput
              id="new-pv-name-input"
              name="new-pv-name-input"
              value={pvName}
              onChange={(value) => setPvName(value)}
            />
          </FormGroup>
          <FormGroup fieldId="new-pv-description" label="Description">
            <TextInput
              id="new-pv-description-input"
              name="new-pv-description-input"
              value={pvDescription}
              onChange={(value) => setPvDescription(value)}
            />
          </FormGroup>
          <FormGroup label="Notebook" fieldId="storage-connection">
            <Select
              variant={SelectVariant.single}
              aria-label="Select Notebook"
              onToggle={() => setIsNotebookSelectOpen(!isNotebookSelectOpen)}
              onSelect={handleNotebookSelection}
              selections={selectedNotebook?.metadata.name || 'None'}
              isOpen={isNotebookSelectOpen}
              label="Workspace"
            >
              {notebookSelectOptions}
            </Select>
          </FormGroup>
          <FormGroup fieldId="pv-mount-location" label="Mount Path">
            <TextInput
              id="new-pv-name-input"
              name="new-pv-name-input"
              value={mountPath}
              onChange={(value) => {
                setMountPath(value);
              }}
              onInput={(e) => {
                setIsMountPathEdited(true);
              }}
              isDisabled={!selectedNotebook}
            />
          </FormGroup>
          <FormGroup fieldId="new-pv-size" label="Size">
            <InputGroup>
              <NumberInput
                id="new-pv-size-input"
                type="number"
                name="new-pv-size-input"
                value={pvSize}
                onMinus={() => setPvSize(pvSize ? pvSize - 1 : 1)}
                onChange={
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  (e) => setPvSize(e.target.value)
                }
                onPlus={() => setPvSize(pvSize + 1)}
                widthChars={4}
                unit="GiB"
              />
            </InputGroup>
          </FormGroup>
        </Form>
      </Modal>
    );
  },
);

StorageModal.displayName = 'StorageModal';

export default StorageModal;
