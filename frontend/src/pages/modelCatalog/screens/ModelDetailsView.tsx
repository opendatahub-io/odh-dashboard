import React from 'react';
import {
  Content,
  DescriptionList,
  Icon,
  PageSection,
  Sidebar,
  SidebarContent,
  SidebarPanel,
} from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import InlineTruncatedClipboardCopy from '~/components/InlineTruncatedClipboardCopy';
import DashboardDescriptionListGroup from '~/components/DashboardDescriptionListGroup';
import { CatalogModel } from '~/concepts/modelCatalog/types';
import ModelTimestamp from '~/pages/modelRegistry/screens/components/ModelTimestamp';
import { getTagFromModel } from '~/pages/modelCatalog/utils';
import ExternalLink from '~/components/ExternalLink';
import { RhUiTagIcon } from '~/images/icons';
import { ModelCatalogLabels } from '~/concepts/modelCatalog/content/ModelCatalogLabels';
import MarkdownComponent from '~/components/markdown/MarkdownComponent';

type ModelDetailsViewProps = {
  model: CatalogModel;
};

const ModelDetailsView: React.FC<ModelDetailsViewProps> = ({ model }) => (
  <PageSection hasBodyWrapper={false} isFilled>
    <Sidebar hasBorder hasGutter isPanelRight>
      <SidebarContent>
        <Content>
          <h2>Description</h2>
          <p data-testid="model-long-description">{model.longDescription}</p>
          <h2>Model card</h2>
          {!model.readme && <p className={text.textColorDisabled}>No model card</p>}
        </Content>
        {model.readme && (
          <MarkdownComponent data={model.readme} dataTestId="model-card-markdown" maxHeading={3} />
        )}
      </SidebarContent>
      <SidebarPanel>
        <DescriptionList isFillColumns>
          <DashboardDescriptionListGroup title="Version" groupTestId="model-version">
            <Icon isInline>
              <RhUiTagIcon />
            </Icon>{' '}
            {getTagFromModel(model)}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Labels"
            contentWhenEmpty="No labels"
            isEmpty={!model.labels?.length && !model.tasks?.length}
          >
            <ModelCatalogLabels
              labels={model.labels ?? []}
              tasks={model.tasks ?? []}
              showNonILabLabels
            />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="License" groupTestId="model-license">
            <ExternalLink
              text="Agreement"
              to={model.licenseLink || ''}
              testId="model-license-link"
            />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Provider" groupTestId="model-provider">
            {model.provider}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Model location">
            <InlineTruncatedClipboardCopy
              testId="source-image-location"
              textToCopy={model.artifacts?.map((artifact) => artifact.uri)[0] || ''}
            />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Last modified">
            <ModelTimestamp timeSinceEpoch={String(model.lastUpdateTimeSinceEpoch)} />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Published">
            <ModelTimestamp timeSinceEpoch={String(model.createTimeSinceEpoch)} />
          </DashboardDescriptionListGroup>
        </DescriptionList>
      </SidebarPanel>
    </Sidebar>
  </PageSection>
);

export default ModelDetailsView;
