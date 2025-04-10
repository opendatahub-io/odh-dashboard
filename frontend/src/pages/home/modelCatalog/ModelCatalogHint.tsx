import * as React from 'react';
import { Content, Flex, FlexItem, Hint, HintBody } from '@patternfly/react-core';
import modelCatalogImg from '~/images/homepage-model-catalog.svg';
import './ModelCatalogHint.scss';

type ModelCatalogHintProps = {
  hidden: boolean;
  actions: React.ReactNode;
};

const ModelCatalogHint: React.FC<ModelCatalogHintProps> = ({ hidden, actions }) => {
  if (hidden) {
    return null;
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
      }}
    >
      <Hint
        data-testid="model-catalog-hint"
        actions={actions}
        className="homepage-model-catalog-hint"
      >
        <HintBody>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapMd' }}
            flexWrap={{ default: 'nowrap' }}
          >
            <img
              data-testid="model-catalog-hint-img"
              src={modelCatalogImg}
              alt="Model catalog homepage motif"
              style={{
                width: '70%',
                maxWidth: 'unset',
                marginLeft: '-2em',
                flexShrink: 0,
              }}
            />
            <FlexItem
              grow={{ default: 'grow' }}
              style={{
                marginLeft: '30px',
                paddingTop: '1em',
                paddingBottom: '1em',
                paddingRight: 0,
                marginRight: '-3em',
              }}
            >
              <Content>
                Discover models that are available for your organization to register, deploy, and
                customize.
              </Content>
            </FlexItem>
          </Flex>
        </HintBody>
      </Hint>
    </div>
  );
};

export default ModelCatalogHint;
