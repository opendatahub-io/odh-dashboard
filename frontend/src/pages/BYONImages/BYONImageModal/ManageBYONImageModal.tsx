import React from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  Tabs,
  Tab,
  TabTitleText,
  Popover,
} from '@patternfly/react-core';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { importBYONImage, updateBYONImage } from '~/services/imagesService';
import { ResponseStatus, BYONImagePackage, BYONImage } from '~/types';
import { useAppSelector } from '~/redux/hooks';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { filterBlankPackages } from '~/pages/BYONImages/utils';
import { AcceleratorIdentifierMultiselect } from '~/pages/BYONImages/BYONImageModal/AcceleratorIdentifierMultiselect';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import ImageLocationField from './ImageLocationField';
import DisplayedContentTabContent from './DisplayedContentTabContent';

export type ManageBYONImageModalProps = {
  existingImage?: BYONImage;
  isOpen: boolean;
  onClose: (submitted: boolean) => void;
};

export enum DisplayedContentTab {
  SOFTWARE,
  PACKAGES,
}

const ManageBYONImageModal: React.FC<ManageBYONImageModalProps> = ({
  existingImage,
  isOpen,
  onClose,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    DisplayedContentTab.SOFTWARE,
  );
  const [isProgress, setIsProgress] = React.useState(false);
  const [repository, setRepository] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [recommendedAcceleratorIdentifiers, setRecommendedAcceleratorIdentifiers] = React.useState<
    string[]
  >([]);
  const [software, setSoftware] = React.useState<BYONImagePackage[]>([]);
  const [packages, setPackages] = React.useState<BYONImagePackage[]>([]);
  const [tempSoftware, setTempSoftware] = React.useState<BYONImagePackage[]>([]);
  const [tempPackages, setTempPackages] = React.useState<BYONImagePackage[]>([]);
  const [editIndex, setEditIndex] = React.useState<number>();
  const userName = useAppSelector((state) => state.user || '');
  const [error, setError] = React.useState<Error>();

  const isEditing = editIndex !== undefined;

  React.useEffect(() => {
    if (existingImage) {
      setRepository(existingImage.url);
      setDisplayName(existingImage.display_name);
      setDescription(existingImage.description);
      setPackages(existingImage.packages);
      setSoftware(existingImage.software);
      setTempPackages(existingImage.packages);
      setTempSoftware(existingImage.software);
      setRecommendedAcceleratorIdentifiers(existingImage.recommendedAcceleratorIdentifiers);
    }
  }, [existingImage]);

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setIsProgress(false);
    setActiveTabKey(DisplayedContentTab.SOFTWARE);
    setRepository('');
    setDisplayName('');
    setDescription('');
    setRecommendedAcceleratorIdentifiers([]);
    setSoftware([]);
    setPackages([]);
    setTempSoftware([]);
    setTempPackages([]);
    setError(undefined);
  };

  const handleResponse = (response: ResponseStatus) => {
    if (response.success === false) {
      setError(new Error(response.error));
    } else {
      onBeforeClose(true);
    }
  };

  const submit = () => {
    if (existingImage) {
      updateBYONImage({
        name: existingImage.name,
        // eslint-disable-next-line camelcase
        display_name: displayName,
        description,
        recommendedAcceleratorIdentifiers,
        packages: filterBlankPackages(packages),
        software: filterBlankPackages(software),
      }).then(handleResponse);
    } else {
      importBYONImage({
        // eslint-disable-next-line camelcase
        display_name: displayName,
        url: repository,
        description,
        recommendedAcceleratorIdentifiers,
        provider: userName,
        packages: filterBlankPackages(packages),
        software: filterBlankPackages(software),
      }).then(handleResponse);
    }
  };

  return (
    <Modal
      onEscapePress={(e) => e.preventDefault()}
      variant={ModalVariant.medium}
      title={`${existingImage ? 'Update' : 'Import'} notebook image`}
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose={!isEditing}
      footer={
        <DashboardModalFooter
          error={error}
          alertTitle={`Error ${existingImage ? 'updating' : 'importing'} notebook image`}
          submitLabel={existingImage ? 'Update' : 'Import'}
          isSubmitDisabled={isProgress || displayName === '' || repository === '' || isEditing}
          onSubmit={submit}
          onCancel={() => onBeforeClose(false)}
          isCancelDisabled={isEditing}
        />
      }
      data-testid="notebook-image-modal"
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ImageLocationField
          isDisabled={!!existingImage}
          location={repository}
          setLocation={setRepository}
        />

        <FormGroup label="Name" isRequired fieldId="byon-image-name-input">
          <TextInput
            id="byon-image-name-input"
            isRequired
            type="text"
            data-testid="byon-image-name-input"
            name="byon-image-name-input"
            value={displayName}
            onChange={(e, value) => {
              setDisplayName(value);
            }}
          />
        </FormGroup>
        <FormGroup label="Description" fieldId="byon-image-description-input">
          <TextInput
            id="byon-image-description-input"
            isRequired
            type="text"
            data-testid="byon-image-description-input"
            name="byon-image-description-input"
            aria-describedby="byon-image-description-input"
            value={description}
            onChange={(e, value) => {
              setDescription(value);
            }}
          />
        </FormGroup>
        <FormGroup
          label="Accelerator identifier"
          labelHelp={
            <Popover bodyContent="Add recommended accelerator identifiers for this image.">
              <DashboardPopupIconButton
                icon={<OutlinedQuestionCircleIcon />}
                aria-label="More info for identifier field"
              />
            </Popover>
          }
        >
          <AcceleratorIdentifierMultiselect
            setData={(identifiers) => setRecommendedAcceleratorIdentifiers(identifiers)}
            data={recommendedAcceleratorIdentifiers}
          />
        </FormGroup>
        <FormGroup label="Displayed contents" fieldId="byon-image-software-packages">
          <Tabs
            id="byon-image-software-packages"
            data-testid="byon-image-software-packages-tabs"
            activeKey={activeTabKey}
            onSelect={(e, indexKey) => {
              setActiveTabKey(indexKey);
            }}
          >
            <Tab
              eventKey={DisplayedContentTab.SOFTWARE}
              title={<TabTitleText>Software</TabTitleText>}
              aria-label="Displayed content software tab"
              data-testid="displayed-content-software-tab"
              tabContentId={`tabContent-${DisplayedContentTab.SOFTWARE}`}
              isDisabled={activeTabKey !== DisplayedContentTab.SOFTWARE && isEditing}
            />
            <Tab
              eventKey={DisplayedContentTab.PACKAGES}
              title={<TabTitleText>Packages</TabTitleText>}
              aria-label="Displayed content packages tab"
              data-testid="displayed-content-packages-tab"
              tabContentId={`tabContent-${DisplayedContentTab.PACKAGES}`}
              isDisabled={activeTabKey !== DisplayedContentTab.PACKAGES && isEditing}
            />
          </Tabs>
          <DisplayedContentTabContent
            activeKey={activeTabKey}
            tabKey={DisplayedContentTab.SOFTWARE}
            resources={software}
            setResources={setSoftware}
            tempResources={tempSoftware}
            setTempResources={setTempSoftware}
            editIndex={editIndex}
            setEditIndex={setEditIndex}
          />
          <DisplayedContentTabContent
            activeKey={activeTabKey}
            tabKey={DisplayedContentTab.PACKAGES}
            resources={packages}
            setResources={setPackages}
            tempResources={tempPackages}
            setTempResources={setTempPackages}
            editIndex={editIndex}
            setEditIndex={setEditIndex}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default ManageBYONImageModal;
