import React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Form,
  FormGroup,
  TextInput,
  Title,
  Modal,
  ModalVariant,
  Tabs,
  Tab,
  TabTitleText,
} from '@patternfly/react-core';
import { Caption, TableComposable, Tbody, Thead, Th, Tr } from '@patternfly/react-table';
import { importNotebook } from '../../services/notebookImageService';
import { State } from '../../redux/types';
import { useSelector } from 'react-redux';
import { ResponseStatus, NotebookPackage } from 'types';
import { EditStepTableRow } from './EditStepTableRow';
import { CubesIcon, ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import './ImportImageModal.scss';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../redux/actions/actions';

export type ImportImageModalProps = {
  isOpen: boolean;
  onCloseHandler: () => void;
  onImportHandler();
};
export const ImportImageModal: React.FC<ImportImageModalProps> = ({
  isOpen,
  onImportHandler,
  onCloseHandler,
}) => {
  const [repository, setRepository] = React.useState<string>('');
  const [name, setName] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [software, setSoftware] = React.useState<NotebookPackage[]>([]);
  const [packages, setPackages] = React.useState<NotebookPackage[]>([]);
  const [activeTabKey, setActiveTabKey] = React.useState<number>(0);
  const [validName, setValidName] = React.useState<boolean>(true);
  const [validRepo, setValidRepo] = React.useState<boolean>(true);
  const userName: string = useSelector<State, string>((state) => state.appState.user || '');
  const dispatch = useDispatch();

  React.useEffect(() => {
    if (isOpen === true) {
      setName('');
      setDescription('');
      setPackages([]);
      setSoftware([]);
      setValidName(true);
      setValidRepo(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal
      variant={ModalVariant.medium}
      title="Import Notebook images"
      isOpen={isOpen}
      onClose={onCloseHandler}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={() => {
            if (name.length > 0 && repository.length > 0) {
              importNotebook({
                name: name,
                url: repository,
                description: description,
                user: userName,
                software: software,
                packages: packages,
              }).then((value: ResponseStatus) => {
                if (value.success === false) {
                  dispatch(
                    addNotification({
                      status: 'danger',
                      title: 'Error',
                      message: `Unable to add notebook image ${name}`,
                      timestamp: new Date(),
                    }),
                  );
                }
                onImportHandler();
                onCloseHandler();
              });
            } else {
              name.length > 0 ? setValidName(true) : setValidName(false);
              repository.length > 0 ? setValidRepo(true) : setValidRepo(false);
            }
          }}
        >
          Import
        </Button>,
        <Button key="cancel" variant="link" onClick={onCloseHandler}>
          Cancel
        </Button>,
      ]}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <FormGroup
          label="Repository"
          isRequired
          fieldId="notebook-image-repository-label"
          helperText="Repo where notebook images are stored."
          helperTextInvalid="This field is required."
          helperTextInvalidIcon={<ExclamationCircleIcon />}
          validated={validRepo ? undefined : 'error'}
        >
          <TextInput
            isRequired
            type="text"
            id="notebook-image-repository-input"
            name="notebook-image-repository-input"
            aria-describedby="notebook-image-repository-input"
            value={repository}
            onChange={(value) => {
              setRepository(value);
            }}
          />
        </FormGroup>
        <FormGroup
          label="Name"
          isRequired
          fieldId="notebook-image-name-label"
          helperTextInvalid="This field is required."
          helperTextInvalidIcon={<ExclamationCircleIcon />}
          validated={validName ? undefined : 'error'}
        >
          <TextInput
            isRequired
            type="text"
            id="notebook-image-name-input"
            name="notebook-image-name-input"
            value={name}
            onChange={(value) => {
              setName(value);
            }}
          />
        </FormGroup>
        <FormGroup label="Description" fieldId="notebook-image-description">
          <TextInput
            isRequired
            type="text"
            id="notebook-image-description-input"
            name="notebook-image-description-input"
            aria-describedby="notebook-image-description-input"
            value={description}
            onChange={(value) => {
              setDescription(value);
            }}
          />
        </FormGroup>
        <FormGroup fieldId="notebook-software-packages">
          <Tabs
            activeKey={activeTabKey}
            onSelect={(_event, indexKey) => {
              setActiveTabKey(indexKey as number);
            }}
          >
            <Tab eventKey={0} title={<TabTitleText>Software</TabTitleText>}>
              {software.length > 0 ? (
                <>
                  <TableComposable aria-label="Simple table" variant="compact">
                    <Caption>
                      Add the advertised software shown with this notebook image. Modifying the
                      software here does not effect the contents of the notebook image.
                    </Caption>
                    <Thead>
                      <Tr>
                        <Th>Software</Th>
                        <Th>Version</Th>
                        <Th />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {software.map((value, currentIndex) => (
                        <EditStepTableRow
                          key={`${value.name}-${currentIndex}`}
                          notebookPackage={value}
                          setEditedValues={(values) => {
                            const updatedPackages = [...software];
                            updatedPackages[currentIndex] = values;
                            setSoftware(updatedPackages);
                          }}
                          onDeleteHandler={() => {
                            setSoftware(software.filter((_value, index) => index !== currentIndex));
                          }}
                        />
                      ))}
                    </Tbody>
                  </TableComposable>
                  <Button
                    variant="link"
                    icon={<PlusCircleIcon />}
                    onClick={() => {
                      setSoftware((previous) => [
                        ...previous,
                        {
                          name: '',
                          version: '',
                          visible: true,
                        },
                      ]);
                    }}
                  >
                    Add Software
                  </Button>
                </>
              ) : (
                <EmptyState variant={EmptyStateVariant.small}>
                  <EmptyStateIcon icon={CubesIcon} />
                  <Title headingLevel="h4" size="lg">
                    No software added
                  </Title>
                  <EmptyStateBody>
                    Add software to be advertised with your notebook image. Making changes here
                    won’t affect the contents of the image.{' '}
                  </EmptyStateBody>
                  <Button
                    className="empty-button"
                    variant="secondary"
                    onClick={() => {
                      setSoftware((previous) => [
                        ...previous,
                        {
                          name: '',
                          version: '',
                          visible: true,
                        },
                      ]);
                    }}
                  >
                    Add software
                  </Button>
                </EmptyState>
              )}
            </Tab>
            <Tab eventKey={1} title={<TabTitleText>Packages</TabTitleText>}>
              {packages.length > 0 ? (
                <>
                  <TableComposable aria-label="Simple table" variant="compact" isStickyHeader>
                    <Caption>
                      Add the advertised packages shown with this notebook image. Modifying the
                      packages here does not effect the contents of the notebook image.
                    </Caption>
                    <Thead>
                      <Tr>
                        <Th>Package</Th>
                        <Th>Version</Th>
                        <Th />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {packages.map((value, currentIndex) => (
                        <EditStepTableRow
                          key={`${value.name}-${currentIndex}`}
                          notebookPackage={value}
                          setEditedValues={(values) => {
                            const updatedPackages = [...packages];
                            updatedPackages[currentIndex] = values;
                            setPackages(updatedPackages);
                          }}
                          onDeleteHandler={() => {
                            setPackages(packages.filter((_value, index) => index !== currentIndex));
                          }}
                        />
                      ))}
                    </Tbody>
                  </TableComposable>
                  <Button
                    variant="link"
                    icon={<PlusCircleIcon />}
                    onClick={() => {
                      setPackages((previous) => [
                        ...previous,
                        {
                          name: '',
                          version: '',
                          visible: true,
                        },
                      ]);
                    }}
                  >
                    Add Package
                  </Button>
                </>
              ) : (
                <EmptyState variant={EmptyStateVariant.small}>
                  <EmptyStateIcon icon={CubesIcon} />
                  <Title headingLevel="h4" size="lg">
                    No packages added
                  </Title>
                  <EmptyStateBody>
                    Add packages to be advertised with your notebook image. Making changes here
                    won’t affect the contents of the image.{' '}
                  </EmptyStateBody>
                  <Button
                    className="empty-button"
                    variant="secondary"
                    onClick={() => {
                      setPackages((previous) => [
                        ...previous,
                        {
                          name: '',
                          version: '',
                          visible: true,
                        },
                      ]);
                    }}
                  >
                    Add package
                  </Button>
                </EmptyState>
              )}
            </Tab>
          </Tabs>
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default ImportImageModal;
