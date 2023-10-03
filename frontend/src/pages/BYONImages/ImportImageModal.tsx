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
  Modal,
  ModalVariant,
  Tabs,
  Tab,
  TabTitleText,
  EmptyStateHeader,
  EmptyStateFooter,
  FormHelperText,
  HelperText,
  HelperTextItem,
  AlertVariant,
} from '@patternfly/react-core';
import { Caption, Table, Tbody, Thead, Th, Tr } from '@patternfly/react-table';
import { CubesIcon, ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { importBYONImage } from '~/services/imagesService';
import { ResponseStatus, BYONImagePackage } from '~/types';
import { addNotification } from '~/redux/actions/actions';
import { useAppDispatch, useAppSelector } from '~/redux/hooks';
import { EditStepTableRow } from './EditStepTableRow';

import './ImportImageModal.scss';

export type ImportImageModalProps = {
  isOpen: boolean;
  onCloseHandler: () => void;
  onImportHandler: () => void;
};
export const ImportImageModal: React.FC<ImportImageModalProps> = ({
  isOpen,
  onImportHandler,
  onCloseHandler,
}) => {
  const [repository, setRepository] = React.useState('');
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [software, setSoftware] = React.useState<BYONImagePackage[]>([]);
  const [packages, setPackages] = React.useState<BYONImagePackage[]>([]);
  const [activeTabKey, setActiveTabKey] = React.useState(0);
  const [validName, setValidName] = React.useState(true);
  const [validRepo, setValidRepo] = React.useState(true);
  const userName = useAppSelector((state) => state.user || '');
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    if (isOpen === true) {
      setName('');
      setDescription('');
      setPackages([]);
      setSoftware([]);
      setValidName(true);
      setValidRepo(true);
    }
  }, [isOpen]);

  return (
    <Modal
      variant={ModalVariant.medium}
      title="Import notebook images"
      isOpen={isOpen}
      onClose={onCloseHandler}
      actions={[
        <Button
          data-id="import-confirm-button"
          key="confirm"
          variant="primary"
          onClick={() => {
            if (name.length > 0 && repository.length > 0) {
              importBYONImage({
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
                      status: AlertVariant.danger,
                      title: `Unable to add notebook image ${name}`,
                      message: value.error,
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
        <Button data-id="import-cancel-button" key="cancel" variant="link" onClick={onCloseHandler}>
          Cancel
        </Button>,
      ]}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <FormGroup label="Repository" isRequired fieldId="byon-image-repository-input">
          <TextInput
            id="byon-image-repository-input"
            isRequired
            type="text"
            data-id="byon-image-repository-input"
            name="byon-image-repository-input"
            aria-describedby="byon-image-repository-input"
            value={repository}
            validated={validRepo ? undefined : 'error'}
            onChange={(e, value) => {
              setRepository(value);
            }}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem
                variant={validRepo ? 'default' : 'error'}
                {...(!validRepo && { icon: <ExclamationCircleIcon /> })}
              >
                {validRepo ? 'Repo where notebook images are stored.' : 'This field is required.'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup label="Name" isRequired fieldId="byon-image-name-input">
          <TextInput
            id="byon-image-name-input"
            isRequired
            validated={validName ? 'default' : 'error'}
            type="text"
            data-id="byon-image-name-input"
            name="byon-image-name-input"
            value={name}
            onChange={(e, value) => {
              setName(value);
            }}
          />
          {!validName && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem icon={<ExclamationCircleIcon />} variant={'error'}>
                  {'This field is required.'}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>
        <FormGroup label="Description" fieldId="byon-image-description-input">
          <TextInput
            id="byon-image-description-input"
            isRequired
            type="text"
            data-id="byon-image-description-input"
            name="byon-image-description-input"
            aria-describedby="byon-image-description-input"
            value={description}
            onChange={(e, value) => {
              setDescription(value);
            }}
          />
        </FormGroup>
        <FormGroup fieldId="byon-image-software-packages">
          <Tabs
            activeKey={activeTabKey}
            onSelect={(e, indexKey) => {
              setActiveTabKey(indexKey as number);
            }}
          >
            <Tab data-id="software-tab" eventKey={0} title={<TabTitleText>Software</TabTitleText>}>
              {software.length > 0 ? (
                <>
                  <Table aria-label="Simple table" variant="compact">
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
                          imagePackage={value}
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
                  </Table>
                  <Button
                    data-id="add-software-secondary-button"
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
                <EmptyState variant={EmptyStateVariant.sm}>
                  <EmptyStateHeader
                    titleText="No software added"
                    icon={<EmptyStateIcon icon={CubesIcon} />}
                    headingLevel="h2"
                  />
                  <EmptyStateBody>
                    Add software to be advertised with your notebook image. Making changes here
                    won’t affect the contents of the image.{' '}
                  </EmptyStateBody>
                  <EmptyStateFooter>
                    <Button
                      data-id="add-software-button"
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
                  </EmptyStateFooter>
                </EmptyState>
              )}
            </Tab>
            <Tab data-id="packages-tab" eventKey={1} title={<TabTitleText>Packages</TabTitleText>}>
              {packages.length > 0 ? (
                <>
                  <Table aria-label="Simple table" variant="compact" isStickyHeader>
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
                          imagePackage={value}
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
                  </Table>
                  <Button
                    data-id="add-package-secondary-button"
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
                <EmptyState variant={EmptyStateVariant.sm}>
                  <EmptyStateHeader
                    titleText="No packages added"
                    icon={<EmptyStateIcon icon={CubesIcon} />}
                    headingLevel="h2"
                  />
                  <EmptyStateBody>
                    Add packages to be advertised with your notebook image. Making changes here
                    won’t affect the contents of the image.{' '}
                  </EmptyStateBody>
                  <EmptyStateFooter>
                    <Button
                      data-id="add-package-button"
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
                  </EmptyStateFooter>
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
