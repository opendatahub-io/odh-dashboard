import * as React from 'react';
import * as _ from 'lodash-es';
import {
  Alert,
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Spinner,
} from '@patternfly/react-core';
import { PodContainer } from '#~/types';
import {
  getDescriptionForTag,
  getImageTagByContainer,
  getNameVersionString,
} from '#~/utilities/imageUtils';
import { useAppContext } from '#~/app/AppContext';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import { formatMemory } from '#~/utilities/valueUnits';
import { useNotebookPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useNotebookPodSpecOptionsState';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { useDashboardNamespace } from '#~/redux/selectors';
import { useImageStreams } from '#~/utilities/useImageStreams';
import { mapImageStreamToImageInfo } from '#~/utilities/imageStreamUtils';
import { getNotebookSizes } from './usePreferredNotebookSize';

const NotebookServerDetails: React.FC = () => {
  const { currentUserNotebook: notebook } = React.useContext(NotebookControllerContext);
  const { dashboardNamespace } = useDashboardNamespace();
  const [imageStreams, loaded] = useImageStreams(dashboardNamespace, { enabled: true });
  const images = React.useMemo(() => imageStreams.map(mapImageStreamToImageInfo), [imageStreams]);
  const [isExpanded, setExpanded] = React.useState(false);
  const { dashboardConfig } = useAppContext();
  const {
    acceleratorProfile: { initialState: initialAcceleratorProfileState },
    hardwareProfile,
  } = useNotebookPodSpecOptionsState(notebook ?? undefined);

  const isHardwareProfileEnabled = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  const container: PodContainer | undefined = notebook?.spec.template.spec.containers.find(
    (currentContainer) => currentContainer.name === notebook.metadata.name,
  );

  if (!container) {
    return (
      <Alert variant="danger" isInline title="There was a problem reading the notebook">
        There was an unexpected error loading notebook details
      </Alert>
    );
  }

  const { image, tag } = getImageTagByContainer(images, container);

  const tagSoftware = getDescriptionForTag(tag);
  const tagDependencies = tag?.content.dependencies ?? [];
  const sizes = getNotebookSizes(dashboardConfig);
  const size = sizes.find((currentSize) =>
    _.isEqual(currentSize.resources.limits, container.resources?.limits),
  );

  const onToggle = (expanded: boolean) => setExpanded(expanded);

  return (
    <ExpandableSection
      data-id="details-expand"
      className="odh-notebook-controller__server-details"
      toggleText="Workbench details"
      onToggle={(e, expanded: boolean) => onToggle(expanded)}
      isExpanded={isExpanded}
      isIndented
    >
      <p className="odh-notebook-controller__server-details-title">Workbench image</p>
      {!image || !tag ? (
        loaded ? (
          <Alert variant="danger" isInline title="Error loading related images...">
            Unable to show workbench image details at this time.
          </Alert>
        ) : (
          <Spinner />
        )
      ) : (
        <>
          <div className="odh-notebook-controller__server-details-image-name">
            <p>{image.display_name}</p>
            {tagSoftware && <Content component={ContentVariants.small}>{tagSoftware}</Content>}
          </div>
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>Packages</DescriptionListTerm>
              <DescriptionListDescription>
                {tagDependencies.length !== 0 &&
                  tagDependencies.map((dependency, index) => (
                    <p key={`imagestream-tag-dependency-${index}`}>
                      {getNameVersionString(dependency)}
                    </p>
                  ))}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </>
      )}

      <p className="odh-notebook-controller__server-details-title">Deployment size</p>
      <DescriptionList isCompact>
        <DescriptionListGroup>
          <DescriptionListTerm>Container size</DescriptionListTerm>
          <DescriptionListDescription>{size ? size.name : 'Unknown'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Limits</DescriptionListTerm>
          <DescriptionListDescription>
            {`${container.resources?.limits?.cpu ?? ''} CPU, ${
              formatMemory(container.resources?.limits?.memory) ?? ''
            } Memory`}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Requests</DescriptionListTerm>
          <DescriptionListDescription>
            {`${container.resources?.requests?.cpu ?? ''} CPU, ${
              formatMemory(container.resources?.requests?.memory) ?? ''
            } Memory`}
          </DescriptionListDescription>
        </DescriptionListGroup>
        {isHardwareProfileEnabled ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Hardware profile</DescriptionListTerm>
            <DescriptionListDescription>
              {hardwareProfile.initialHardwareProfile
                ? hardwareProfile.initialHardwareProfile.spec.displayName
                : hardwareProfile.formData.useExistingSettings
                ? 'Unknown'
                : 'None'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : (
          <>
            <DescriptionListGroup>
              <DescriptionListTerm>Accelerator</DescriptionListTerm>
              <DescriptionListDescription>
                {initialAcceleratorProfileState.acceleratorProfile
                  ? initialAcceleratorProfileState.acceleratorProfile.spec.displayName
                  : initialAcceleratorProfileState.unknownProfileDetected
                  ? 'Unknown'
                  : 'None'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            {!initialAcceleratorProfileState.unknownProfileDetected && (
              <DescriptionListGroup>
                <DescriptionListTerm>Number of accelerators</DescriptionListTerm>
                <DescriptionListDescription>
                  {initialAcceleratorProfileState.count}
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </>
        )}
      </DescriptionList>
    </ExpandableSection>
  );
};

NotebookServerDetails.displayName = 'NotebookServerDetails';

export default NotebookServerDetails;
