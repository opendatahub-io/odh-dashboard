import * as React from 'react';
import * as _ from 'lodash-es';
import {
  Alert,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Spinner,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { NotebookContainer } from '~/types';
import {
  getDescriptionForTag,
  getImageAndTagByContainerEnvJupyterImage,
  getNameVersionString,
} from '~/utilities/imageUtils';
import { useAppContext } from '~/app/AppContext';
import { useWatchImages } from '~/utilities/useWatchImages';
import { NotebookControllerContext } from '~/pages/notebookController/NotebookControllerContext';
import useNotebookAccelerator from '~/pages/projects/screens/detail/notebooks/useNotebookAccelerator';
import { getNotebookSizes } from './usePreferredNotebookSize';

const NotebookServerDetails: React.FC = () => {
  const { currentUserNotebook: notebook } = React.useContext(NotebookControllerContext);
  const { images, loaded } = useWatchImages();
  const [isExpanded, setExpanded] = React.useState(false);
  const { dashboardConfig } = useAppContext();
  const [accelerator] = useNotebookAccelerator(notebook);

  const container: NotebookContainer | undefined = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  );

  if (!container) {
    return (
      <Alert variant="danger" isInline title="There was a problem reading the notebook">
        There was an unexpected error loading notebook details
      </Alert>
    );
  }

  const { image, tag } = getImageAndTagByContainerEnvJupyterImage(images, container);

  const tagSoftware = getDescriptionForTag(tag);
  const tagDependencies = tag?.content.dependencies ?? [];
  const sizes = getNotebookSizes(dashboardConfig);
  const size = sizes.find((size) => _.isEqual(size.resources.limits, container.resources?.limits));

  const onToggle = (expanded: boolean) => setExpanded(expanded);

  return (
    <ExpandableSection
      data-id="details-expand"
      className="odh-notebook-controller__server-details"
      toggleText="Notebook server details"
      onToggle={onToggle}
      isExpanded={isExpanded}
      isIndented
    >
      <p className="odh-notebook-controller__server-details-title">Notebook image</p>
      {!image || !tag ? (
        loaded ? (
          <Alert variant="danger" isInline title="Error loading related images...">
            Unable to show notebook image details at this time.
          </Alert>
        ) : (
          <Spinner />
        )
      ) : (
        <>
          <div className="odh-notebook-controller__server-details-image-name">
            <p>{image.display_name}</p>
            {tagSoftware && <Text component={TextVariants.small}>{tagSoftware}</Text>}
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
          <DescriptionListDescription>{`${container.resources?.limits?.cpu} CPU, ${container.resources?.limits?.memory} Memory`}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Requests</DescriptionListTerm>
          <DescriptionListDescription>{`${container.resources?.requests?.cpu} CPU, ${container.resources?.requests?.memory} Memory`}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Accelerator</DescriptionListTerm>
          <DescriptionListDescription>
            {accelerator.accelerator
              ? accelerator.accelerator.spec.displayName
              : accelerator.useExisting
              ? 'Unknown'
              : 'None'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        {!accelerator.useExisting && (
          <DescriptionListGroup>
            <DescriptionListTerm>Number of accelerators</DescriptionListTerm>
            <DescriptionListDescription>{accelerator.count}</DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
    </ExpandableSection>
  );
};

NotebookServerDetails.displayName = 'NotebookServerDetails';

export default NotebookServerDetails;
