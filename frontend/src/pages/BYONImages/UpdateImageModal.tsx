import React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Form,
  FormGroup,
  Tab,
  Tabs,
  TabTitleText,
  TextInput,
  Title,
  Modal,
  ModalVariant,
} from '@patternfly/react-core';
import { Caption, TableComposable, Tbody, Thead, Th, Tr } from '@patternfly/react-table';
import { CubesIcon, ExclamationCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { updateBYONImage } from '../../services/imagesService';
import { EditStepTableRow } from './EditStepTableRow';
import { BYONImage, BYONImagePackage } from 'types';
import './UpdateImageModal.scss';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../redux/actions/actions';

export type UpdateImageModalProps = {
  isOpen: boolean;
  image: BYONImage;
  onCloseHandler: () => void;
  onUpdateHandler();
};
export const UpdateImageModal: React.FC<UpdateImageModalProps> = ({
  isOpen,
  image,
  onUpdateHandler,
  onCloseHandler,
}) => {
  const [name, setName] = React.useState<string>(image.name);
  const [description, setDescription] = React.useState<string>(
    image.description != undefined ? image.description : '',
  );
  const [packages, setPackages] = React.useState<BYONImagePackage[]>(
    image.packages != undefined ? image.packages : [],
  );
  const [software, setSoftware] = React.useState<BYONImagePackage[]>(
    image.software != undefined ? image.software : [],
  );
  const [activeTabKey, setActiveTabKey] = React.useState<number>(0);
  const [validName, setValidName] = React.useState<boolean>(true);
  const dispatch = useDispatch();

  React.useEffect(() => {
    if (isOpen === true) {
      setName(image.name);
      setDescription(image.description != undefined ? image.description : '');
      setPackages(image.packages != undefined ? image.packages : []);
      setSoftware(image.software != undefined ? image.software : []);
      setValidName(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal
      variant={ModalVariant.medium}
      title={`Edit Package Documentation for ${image.name}`}
      isOpen={isOpen}
      onClose={onCloseHandler}
      actions={[
        <Button
          id="save-button"
          key="confirm"
          variant="primary"
          onClick={() => {
            if (name.length > 0) {
              updateBYONImage({
                id: image.id,
                name: name,
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
                onUpdateHandler();
                onCloseHandler();
              });
            } else {
              name.length > 0 ? setValidName(true) : setValidName(false);
            }
          }}
        >
          Save Changes
        </Button>,
        <Button id="cancel-button" key="cancel" variant="link" onClick={onCloseHandler}>
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
          label="Name"
          isRequired
          fieldId="byon-image-name-label"
          helperTextInvalid="This field is required."
          helperTextInvalidIcon={<ExclamationCircleIcon />}
          validated={validName ? undefined : 'error'}
        >
          <TextInput
            id="byon-image-name-input"
            isRequired
            type="text"
            name="byon-image-name-input"
            value={name}
            onChange={(value) => {
              setName(value);
            }}
          />
        </FormGroup>
        <FormGroup label="Description" fieldId="byon-image-description">
          <TextInput
            id="byon-image-description-input"
            isRequired
            type="text"
            name="byon-image-description-input"
            aria-describedby="byon-image-description-input"
            value={description}
            onChange={(value) => {
              setDescription(value);
            }}
          />
        </FormGroup>
        <FormGroup fieldId="image-software-packages">
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
                      Change the advertised software shown with this notebook image. Modifying the
                      software here does not effect the contents of the notebook image.
                    </Caption>
                    <Thead>
                      <Tr>
                        <Th id="software-column">Software</Th>
                        <Th id="version-column">Version</Th>
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
                    id="add-software-button"
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
                    id="add-software-button"
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
                      Change the advertised packages shown with this notebook image. Modifying the
                      packages here does not effect the contents of the notebook image.
                    </Caption>
                    <Thead>
                      <Tr>
                        <Th id="package-column">Package</Th>
                        <Th id="version-column">Version</Th>
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
                    id="add-package-button"
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
                    id="add-package-button"
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

export default UpdateImageModal;
