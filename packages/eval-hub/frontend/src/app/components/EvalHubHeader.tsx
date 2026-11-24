import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import EvalHubIcon from './EvalHubIcon';

const ICON_SIZE = 40;

type EvalHubHeaderProps = {
  title: string;
  projectContent?: React.ReactNode;
};

const EvalHubHeader: React.FC<EvalHubHeaderProps> = ({ title, projectContent }) => {
  const unifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const visibleProjectContent = !unifiedProjectSelectorEnabled && projectContent;
  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      gap={{ default: visibleProjectContent ? 'gapXl' : 'gapNone' }}
      flexWrap={{ default: 'wrap' }}
    >
      <FlexItem>
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <div
              style={{
                background: '#D0C5F4',
                borderRadius: ICON_SIZE / 2,
                width: ICON_SIZE,
                height: ICON_SIZE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a1a1a',
              }}
            >
              <EvalHubIcon />
            </div>
          </FlexItem>
          <FlexItem>{title}</FlexItem>
        </Flex>
      </FlexItem>
      {visibleProjectContent && <FlexItem>{visibleProjectContent}</FlexItem>}
    </Flex>
  );
};

export default EvalHubHeader;
