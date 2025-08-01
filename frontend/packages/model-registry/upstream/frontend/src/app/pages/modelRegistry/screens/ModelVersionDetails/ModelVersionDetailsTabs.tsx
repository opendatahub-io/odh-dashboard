import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { ModelVersion } from '~/app/types';
import { ModelVersionDetailsTabTitle, ModelVersionDetailsTab } from './const';
import ModelVersionDetailsView from './ModelVersionDetailsView';
import { isModelRegistryVersionDetailsTabExtension } from '~/odh/extension-points/details';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';

type ModelVersionDetailTabsProps = {
  tab: ModelVersionDetailsTab;
  modelVersion: ModelVersion;
  isArchiveVersion?: boolean;
  refresh: () => void;
};

const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps> = ({
  tab,
  modelVersion: mv,
  isArchiveVersion,
  refresh,
}) => {
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const tabExtensions = useExtensions(isModelRegistryVersionDetailsTabExtension);

  const modelVersionDetails = [
    <Tab
      key={ModelVersionDetailsTab.DETAILS}
      eventKey={ModelVersionDetailsTab.DETAILS}
      title={<TabTitleText>{ModelVersionDetailsTabTitle.DETAILS}</TabTitleText>}
      aria-label="Model versions details tab"
      data-testid="model-versions-details-tab"
    >
      <PageSection hasBodyWrapper={false} isFilled data-testid="model-versions-details-tab-content">
        <ModelVersionDetailsView
          modelVersion={mv}
          refresh={refresh}
          isArchiveVersion={isArchiveVersion}
        />
      </PageSection>
    </Tab>,
    ...tabExtensions.map((extension) => (
      <Tab
        key={extension.properties.id}
        eventKey={extension.properties.id}
        aria-label={`${extension.properties.title} tab`}
        data-testid={`${extension.properties.id}-tab`}
        title={<TabTitleText>{extension.properties.title}</TabTitleText>}
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid={`${extension.properties.id}-tab-content`}
        >
          <LazyCodeRefComponent
            component={extension.properties.component}
            props={{
              mv,
              mrName: preferredModelRegistry?.name,
              refresh,
              isArchiveVersion,
            }}
          />
        </PageSection>
      </Tab>
    )),
  ];

  return (
    <Tabs
      activeKey={tab}
      aria-label="Model versions details page tabs"
      role="region"
      data-testid="model-versions-details-page-tabs"
      onSelect={(_event, eventKey) => navigate(`../${eventKey}`, { relative: 'path' })}
    >
      {modelVersionDetails}
    </Tabs>
  );
};

export default ModelVersionDetailsTabs;
