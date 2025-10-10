import React from 'react';
import { Badge, Content, ExpandableSection, ExpandableSectionToggle } from '@patternfly/react-core';
import { ModelResourceType } from '@odh-dashboard/model-serving/extension-points';

type AIAssetExpandableSectionProps = {
  models: ModelResourceType | ModelResourceType[];
  testIdPrefix?: string;
};

const isAIAsset = (model: ModelResourceType): boolean =>
  model.metadata.annotations?.['opendatahub.io/genai-asset'] === 'true';

const AIAssetExpandableSection: React.FC<AIAssetExpandableSectionProps> = ({
  models,
  testIdPrefix = 'ai-assets',
}) => {
  const [aiAssetsExpanded, setAiAssetsExpanded] = React.useState<boolean>(false);
  const modelArray = Array.isArray(models) ? models : [models];
  const aiAssetModels = modelArray.filter(isAIAsset);

  if (aiAssetModels.length === 0) {
    return null;
  }

  return (
    <div className="pf-v6-u-mt-md">
      <ExpandableSectionToggle
        isExpanded={aiAssetsExpanded}
        onToggle={setAiAssetsExpanded}
        id="expand-connected-ai-assets-toggle"
        contentId="expanded-connected-ai-assets"
        data-testid={`${testIdPrefix}-toggle`}
      >
        <span>AI assets </span>
        <Badge isRead data-testid={`${testIdPrefix}-count`}>
          {aiAssetModels.length}
        </Badge>
      </ExpandableSectionToggle>
      {aiAssetsExpanded && (
        <ExpandableSection
          isExpanded
          isDetached
          toggleId="expand-connected-ai-assets-toggle"
          contentId="expanded-connected-ai-assets"
        >
          <Content>
            <Content component="ul" className="pf-v6-u-ml-lg">
              {aiAssetModels.map((model) => (
                <Content
                  component="li"
                  key={model.metadata.name}
                  data-testid={`${testIdPrefix}-item`}
                >
                  {model.metadata.annotations?.['opendatahub.io/genai-use-case']}
                </Content>
              ))}
            </Content>
          </Content>
        </ExpandableSection>
      )}
    </div>
  );
};

export default AIAssetExpandableSection;
