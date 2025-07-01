import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import {
  FetchStateObject,
  InferenceServiceKind,
  ServingRuntimeKind,
} from 'mod-arch-shared';
import { ModelVersion } from '~/app/types';
import { ModelVersionDetailsTabTitle, ModelVersionDetailsTab } from './const';
import ModelVersionDetailsView from './ModelVersionDetailsView';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isModelRegistryDeploymentsTabExtension } from '@odh-dashboard/model-registry/extension-points';

type ModelVersionDetailTabsProps = {
  tab: ModelVersionDetailsTab;
  modelVersion: ModelVersion;
  inferenceServices: FetchStateObject<InferenceServiceKind[]>;
  servingRuntimes: FetchStateObject<ServingRuntimeKind[]>;
  isArchiveVersion?: boolean;
  refresh: () => void;
};

const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps> = ({
  tab,
  modelVersion: mv,
  inferenceServices,
  servingRuntimes,
  isArchiveVersion,
  refresh,
}) => {
  const navigate = useNavigate();
  const extensions = useExtensions(isModelRegistryDeploymentsTabExtension);

  const findProps = (id: string) => {
    if (id === ModelVersionDetailsTab.DEPLOYMENTS) {
      return {
        inferenceServices,
        servingRuntimes,
        refresh,
      };
    }
    return null;
  };

  return (
    <Tabs
      activeKey={tab}
      aria-label="Model versions details page tabs"
      role="region"
      data-testid="model-versions-details-page-tabs"
      onSelect={(_event, eventKey) => navigate(`../${eventKey}`, { relative: 'path' })}
    >
      <Tab
        eventKey={ModelVersionDetailsTab.DETAILS}
        title={<TabTitleText>{ModelVersionDetailsTabTitle.DETAILS}</TabTitleText>}
        aria-label="Model versions details tab"
        data-testid="model-versions-details-tab"
      >
        <PageSection
          hasBodyWrapper={false}
          isFilled
          data-testid="model-versions-details-tab-content"
        >
          <ModelVersionDetailsView
            modelVersion={mv}
            refresh={refresh}
            isArchiveVersion={isArchiveVersion}
          />
        </PageSection>
      </Tab>
      <>
        {extensions.map((extension) => {
          console.log('extension', extension);
          const tabProps = findProps(extension.properties.id);
          if (!tabProps) {
            return null;
          }
          return (
            <Tab
              key={extension.properties.id}
              eventKey={extension.properties.id}
              aria-label={`${extension.properties.title} tab`}
              data-testid={`${extension.properties.id}-tab`}
              title={<TabTitleText>{extension.properties.title}</TabTitleText>}
            >
              <PageSection hasBodyWrapper={false} isFilled data-testid={`${extension.properties.id}-tab-content`}>
                <LazyCodeRefComponent
                  component={extension.properties.component}
                  props={tabProps}
                />
              </PageSection>
            </Tab>
        )})}
      </>
    </Tabs>
  );
};

export default ModelVersionDetailsTabs;
