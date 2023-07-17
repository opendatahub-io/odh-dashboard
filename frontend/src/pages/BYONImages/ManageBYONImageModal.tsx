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
import { CubesIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { importBYONImage, updateBYONImage } from '~/services/imagesService';
import { ResponseStatus, BYONImagePackage, BYONImage } from '~/types';
import { addNotification } from '~/redux/actions/actions';
import { useAppDispatch, useAppSelector } from '~/redux/hooks';
import { EditStepTableRow } from './EditStepTableRow';

import './ImportImageModal.scss';

export type ManageBYONImageModalProps = {
  existingImage?: BYONImage;
  isOpen: boolean;
  onClose: (submitted: boolean) => void;
};

export const ManageBYONImageModal: React.FC<ManageBYONImageModalProps> = ({
  existingImage,
  isOpen,
  onClose,
}) => {
  const [isProgress, setIsProgress] = React.useState(false);
  const [repository, setRepository] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [software, setSoftware] = React.useState<BYONImagePackage[]>([]);
  const [packages, setPackages] = React.useState<BYONImagePackage[]>([]);
  const [activeTabKey, setActiveTabKey] = React.useState(0);
  const userName = useAppSelector((state) => state.user || '');
  const dispatch = useAppDispatch();

  const isDisabled = isProgress || displayName === '' || repository === '';

  React.useEffect(() => {
    if (existingImage) {
      setRepository(existingImage.url);
      setDisplayName(existingImage.display_name);
      setDescription(existingImage.description);
      setPackages(existingImage.packages);
      setSoftware(existingImage.software);
    }
  }, [existingImage]);

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setIsProgress(false);
    setRepository('');
    setDisplayName('');
    setDescription('');
    setSoftware([]);
    setPackages([]);
  };

  const submit = () => {
    if (existingImage) {
      updateBYONImage({
        name: existingImage.name,
        // eslint-disable-next-line camelcase
        display_name: displayName,
        description: description,
        packages: packages,
        software: software,
      }).then((value) => {
        if (value.success === false) {
          dispatch(
            addNotification({
              status: 'danger',
              title: 'Error',
              message: `Unable to update image ${name}`,
              timestamp: new Date(),
            }),
          );
        }
        onBeforeClose(true);
      });
    } else {
      importBYONImage({
        // eslint-disable-next-line camelcase
        display_name: displayName,
        url: repository,
        description: description,
        provider: userName,
        software: software,
        packages: packages,
      }).then((value: ResponseStatus) => {
        if (value.success === false) {
          dispatch(
            addNotification({
              status: 'danger',
              title: `Unable to add notebook image ${name}`,
              message: value.error,
              timestamp: new Date(),
            }),
          );
        }
        onBeforeClose(true);
      });
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      title={`${existingImage ? 'Update' : 'Import'} notebook image`}
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button
          data-id="import-confirm-button"
          key="confirm"
          variant="primary"
          isDisabled={isDisabled}
          onClick={submit}
        >
          {existingImage ? 'Update' : 'Import'}
        </Button>,
        <Button
          data-id="import-cancel-button"
          key="cancel"
          variant="link"
          onClick={() => onBeforeClose(false)}
        >
          Cancel
        </Button>,
      ]}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {!existingImage && (
          <FormGroup
            label="Repository"
            isRequired
            fieldId="byon-image-repository-input"
            helperText="Repo where notebook images are stored."
          >
            <TextInput
              id="byon-image-repository-input"
              isRequired
              type="text"
              data-id="byon-image-repository-input"
              name="byon-image-repository-input"
              aria-describedby="byon-image-repository-input"
              value={repository}
              onChange={(value) => {
                setRepository(value);
              }}
            />
          </FormGroup>
        )}
        <FormGroup label="Name" isRequired fieldId="byon-image-name-input">
          <TextInput
            id="byon-image-name-input"
            isRequired
            type="text"
            data-id="byon-image-name-input"
            name="byon-image-name-input"
            value={displayName}
            onChange={(value) => {
              setDisplayName(value);
            }}
          />
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
            onChange={(value) => {
              setDescription(value);
            }}
          />
        </FormGroup>
        <FormGroup fieldId="byon-image-software-packages">
          <Tabs
            activeKey={activeTabKey}
            onSelect={(_event, indexKey) => {
              setActiveTabKey(indexKey as number);
            }}
          >
            <Tab data-id="software-tab" eventKey={0} title={<TabTitleText>Software</TabTitleText>}>
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
                  </TableComposable>
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
                <EmptyState variant={EmptyStateVariant.small}>
                  <EmptyStateIcon icon={CubesIcon} />
                  <Title headingLevel="h2" size="lg">
                    No software added
                  </Title>
                  <EmptyStateBody>
                    Add software to be advertised with your notebook image. Making changes here
                    won’t affect the contents of the image.{' '}
                  </EmptyStateBody>
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
                </EmptyState>
              )}
            </Tab>
            <Tab data-id="packages-tab" eventKey={1} title={<TabTitleText>Packages</TabTitleText>}>
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
                  </TableComposable>
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
                <EmptyState variant={EmptyStateVariant.small}>
                  <EmptyStateIcon icon={CubesIcon} />
                  <Title headingLevel="h2" size="lg">
                    No packages added
                  </Title>
                  <EmptyStateBody>
                    Add packages to be advertised with your notebook image. Making changes here
                    won’t affect the contents of the image.{' '}
                  </EmptyStateBody>
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
                </EmptyState>
              )}
            </Tab>
          </Tabs>
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default ManageBYONImageModal;
