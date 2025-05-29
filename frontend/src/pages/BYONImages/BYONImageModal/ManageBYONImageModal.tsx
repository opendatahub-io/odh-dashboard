import React from 'react';
import {
  Form,
  FormGroup,
  Tabs,
  Tab,
  TabTitleText,
  Popover,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { importBYONImage, updateBYONImage } from '#~/services/imagesService';
import { ResponseStatus, BYONImagePackage, BYONImage } from '#~/types';
import { useAppSelector } from '#~/redux/hooks';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { filterBlankPackages } from '#~/pages/BYONImages/utils';
import { AcceleratorIdentifierMultiselect } from '#~/pages/BYONImages/BYONImageModal/AcceleratorIdentifierMultiselect';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import { HardwareProfileIdentifierMultiselect } from '#~/pages/BYONImages/BYONImageModal/HardwareProfileIdentifierMultiselect';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import ImageLocationField from './ImageLocationField';
import DisplayedContentTabContent from './DisplayedContentTabContent';

export type ManageBYONImageModalProps = {
  existingImage?: BYONImage;
  onClose: (submitted: boolean) => void;
};

export enum DisplayedContentTab {
  SOFTWARE,
  PACKAGES,
}

const ManageBYONImageModal: React.FC<ManageBYONImageModalProps> = ({ existingImage, onClose }) => {
  const isHardwareProfileAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    DisplayedContentTab.SOFTWARE,
  );
  const [isProgress, setIsProgress] = React.useState(false);
  const [repository, setRepository] = React.useState('');
  const [recommendedAcceleratorIdentifiers, setRecommendedAcceleratorIdentifiers] = React.useState<
    string[]
  >([]);
  const [software, setSoftware] = React.useState<BYONImagePackage[]>([]);
  const [packages, setPackages] = React.useState<BYONImagePackage[]>([]);
  const userName = useAppSelector((state) => state.user || '');
  const [error, setError] = React.useState<Error>();

  const { data: byonNameDesc, onDataChange: setByonNameDesc } = useK8sNameDescriptionFieldData({
    initialData: existingImage
      ? {
          name: existingImage.display_name,
          k8sName: existingImage.name,
          description: existingImage.description,
        }
      : undefined,
    regexp: /^[a-z0-9]+(?:[._-][a-z0-9]+)*[a-z0-9]?$/,
    invalidCharsMessage:
      'Must start and end with a letter or number. Valid characters include lowercase letters, numbers, and the special characters: period (.), hyphen (-), and underscore (_). Special characters cannot appear consecutively.',
  });

  React.useEffect(() => {
    if (existingImage) {
      setRepository(existingImage.url);
      setPackages(existingImage.packages);
      setSoftware(existingImage.software);
      setRecommendedAcceleratorIdentifiers(existingImage.recommendedAcceleratorIdentifiers);
    }
  }, [existingImage]);

  const handleResponse = (response: ResponseStatus) => {
    setIsProgress(false);
    if (response.success === false) {
      setError(new Error(response.error));
    } else {
      onClose(true);
    }
  };

  const submit = () => {
    setIsProgress(true);
    if (existingImage) {
      updateBYONImage({
        name: existingImage.name,
        // eslint-disable-next-line camelcase
        display_name: byonNameDesc.name,
        description: byonNameDesc.description,
        recommendedAcceleratorIdentifiers,
        packages: filterBlankPackages(packages),
        software: filterBlankPackages(software),
      }).then(handleResponse);
    } else {
      importBYONImage({
        // eslint-disable-next-line camelcase
        display_name: byonNameDesc.name,
        name: byonNameDesc.k8sName.value,
        url: repository,
        description: byonNameDesc.description,
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
      variant="medium"
      isOpen
      onClose={() => onClose(false)}
      data-testid="workbench-image-modal"
    >
      <ModalHeader title={`${existingImage ? 'Update' : 'Import'} workbench image`} />
      <ModalBody>
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
          <K8sNameDescriptionField
            data={byonNameDesc}
            onDataChange={setByonNameDesc}
            dataTestId="byon-image"
          />
          {isHardwareProfileAvailable ? (
            <FormGroup
              label="Hardware profile identifier"
              labelHelp={
                <Popover bodyContent="Add recommended hardware profile identifiers for this image.">
                  <DashboardPopupIconButton
                    icon={<OutlinedQuestionCircleIcon />}
                    aria-label="More info for identifier field"
                  />
                </Popover>
              }
            >
              <HardwareProfileIdentifierMultiselect
                setData={(identifiers) => setRecommendedAcceleratorIdentifiers(identifiers)}
                data={recommendedAcceleratorIdentifiers}
              />
            </FormGroup>
          ) : (
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
          )}
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
              />
              <Tab
                eventKey={DisplayedContentTab.PACKAGES}
                title={<TabTitleText>Packages</TabTitleText>}
                aria-label="Displayed content packages tab"
                data-testid="displayed-content-packages-tab"
                tabContentId={`tabContent-${DisplayedContentTab.PACKAGES}`}
              />
            </Tabs>
            <DisplayedContentTabContent
              activeKey={activeTabKey}
              tabKey={DisplayedContentTab.SOFTWARE}
              resources={software}
              setResources={setSoftware}
            />
            <DisplayedContentTabContent
              activeKey={activeTabKey}
              tabKey={DisplayedContentTab.PACKAGES}
              resources={packages}
              setResources={setPackages}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          error={error}
          alertTitle={`Error ${existingImage ? 'updating' : 'importing'} workbench image`}
          submitLabel={existingImage ? 'Update' : 'Import'}
          isSubmitDisabled={
            isProgress || !isK8sNameDescriptionDataValid(byonNameDesc) || repository === ''
          }
          onSubmit={submit}
          onCancel={() => onClose(false)}
        />
      </ModalFooter>
    </Modal>
  );
};

export default ManageBYONImageModal;
