import * as React from 'react';
import {
  Button,
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
  Notebook,
  NotebookList,
  PersistentVolumeClaim,
  PersistentVolumeClaimList,
  Volume,
} from 'types';
import { patchNotebook } from '../../../services/notebookService';
import { getNotebookContainer } from '../../../utilities/notebookUtils';

type AttachStorageModalProps = {
  notebook: Notebook | null;
  notebookList: NotebookList | undefined;
  pvcList: PersistentVolumeClaimList | undefined;
  isModalOpen: boolean;
  onClose: () => void;
};

const AttachStorageModal: React.FC<AttachStorageModalProps> = React.memo(
  ({ notebook, notebookList, pvcList, isModalOpen, onClose }) => {
    const [isPvcSelectOpen, setIsPvcSelectOpen] = React.useState(false);
    const [selectedPvc, setSelectedPvc] = React.useState<PersistentVolumeClaim | undefined>(
      undefined,
    );
    const [mountPath, setMountPath] = React.useState('');
    const [isMountPathEdited, setIsMountPathEdited] = React.useState(false);

    const nameInputRef = React.useRef<HTMLInputElement>(null);
    const validate = () => !!selectedPvc && !!mountPath;

    const notebookContainer = getNotebookContainer(notebook);

    const pvcSelectOptions = pvcList?.items
      ?.filter((pvc) => {
        const accessMany = pvc.spec.accessModes.find((am) => {
          return am === 'ReadOnlyMany' || am === 'ReadWriteMany';
        });
        if (accessMany) {
          return true;
        }
        const alreadyAttached = notebookList?.items.find((nb) => {
          const nbc = getNotebookContainer(nb);
          return nbc?.volumeMounts.find((vm) => vm.name === pvc.metadata.name);
        });
        return !alreadyAttached;
      })
      .map((pvc, index) => <SelectOption key={index + 1} value={pvc.metadata.name} />);

    React.useEffect(() => {
      if (isModalOpen) {
        init();
      }
      if (isModalOpen && nameInputRef && nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, [isModalOpen, notebook]);

    React.useEffect(() => {
      setMountPath(selectedPvc ? `/home/storage/${selectedPvc.metadata.name}` : '');
    }, [selectedPvc]);

    if (!notebookContainer) {
      return null;
    }

    const init = () => {
      setIsPvcSelectOpen(false);
      setSelectedPvc(undefined);
      setMountPath('');
      setIsMountPathEdited(false);
    };

    const attachPvc = () => {
      if (!selectedPvc || !mountPath || !notebook) {
        return Promise.reject('attachPvc failure');
      }

      const name = selectedPvc.metadata.name;
      const containers = notebook?.spec?.template?.spec?.containers;
      const volumes: Volume[] = notebook?.spec?.template?.spec?.volumes || [];
      const notebookContainer = getNotebookContainer(notebook);

      if (!notebookContainer) {
        return Promise.reject('no notebook container');
      }
      notebookContainer.volumeMounts.push({ mountPath, name });
      volumes.push({ name, persistentVolumeClaim: { claimName: name } });

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
      return patchNotebook(
        notebook.metadata.namespace,
        notebook.metadata.name,
        updateData,
      );
    };

    const handlePvcSelection = (e, value) => {
      if (value === 'None') {
        setSelectedPvc(undefined);
      } else {
        const selected = pvcList?.items.find((pvc) => pvc.metadata.name === value);
        setSelectedPvc(selected);
      }
      setIsPvcSelectOpen(false);
    };

    const handleAttachStorage = () => {
      attachPvc()
        .then(onClose)
        .catch((err) => {
          console.error(err);
          onClose();
        });
    };

    return (
      <Modal
        aria-label="Attach Storage"
        className="odh-data-projects__modal"
        variant={ModalVariant.large}
        title="Attach Storage"
        // description="Select the persistent volume claim and mount."
        isOpen={isModalOpen}
        onClose={onClose}
        actions={[
          <Button
            key={'attachStorage'}
            variant="primary"
            isDisabled={!validate()}
            onClick={handleAttachStorage}
          >
            Attach Storage
          </Button>,
          <Button key="cancel" variant="secondary" onClick={onClose}>
            Cancel
          </Button>,
        ]}
      >
        <Title headingLevel="h3" size="lg" className="odh-data-projects__modal-title">
          Select the persistent volume claim and mount:
        </Title>
        <Form className="odh-data-projects__modal-form">
          <FormGroup label="Persistent Volume Claim" fieldId="storage-connection">
            <Select
              variant={SelectVariant.single}
              aria-label="Select VC"
              onToggle={() => setIsPvcSelectOpen(!isPvcSelectOpen)}
              onSelect={handlePvcSelection}
              selections={selectedPvc?.metadata.name || 'None'}
              isOpen={isPvcSelectOpen}
              menuAppendTo="parent"
              label="Workspace"
            >
              {pvcSelectOptions}
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
              isDisabled={!selectedPvc}
            />
          </FormGroup>
        </Form>
      </Modal>
    );
  },
);

AttachStorageModal.displayName = 'AttachStorageModal';

export default AttachStorageModal;
