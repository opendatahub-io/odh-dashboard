import * as React from 'react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';

const WORKLOADS_PAGE_DESCRIPTION = 'Monitor the metrics of your active resources.';

const InfrastructureWorkloadsSection: React.FC = () => {
  const { projects, preferredProject, updatePreferredProject } = React.useContext(ProjectsContext);
  const [lastRefreshed, setLastRefreshed] = React.useState(() => new Date());
  const [currentTime, setCurrentTime] = React.useState(() => Date.now());

  React.useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 20_000);
    return () => window.clearInterval(interval);
  }, []);

  const handleProjectSelection = React.useCallback(
    (projectName: string) => {
      updatePreferredProject(
        projects.find((project) => project.metadata.name === projectName) ?? null,
      );
    },
    [projects, updatePreferredProject],
  );

  const refreshTime = relativeTime(currentTime, lastRefreshed.getTime());

  return (
    <Stack hasGutter data-testid="infrastructure-workloads">
      <StackItem>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          flexWrap={{ default: 'wrap' }}
          gap={{ default: 'gapMd' }}
          data-testid="infrastructure-workloads-header"
        >
          <FlexItem>
            <Title headingLevel="h2" data-testid="infrastructure-workloads-title">
              Workloads
            </Title>
          </FlexItem>
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
              data-testid="infrastructure-workloads-refresh"
            >
              <FlexItem>
                <Tooltip content="Refresh">
                  <Button
                    variant="plain"
                    aria-label="Refresh"
                    onClick={() => setLastRefreshed(new Date())}
                  >
                    <SyncAltIcon />
                  </Button>
                </Tooltip>
              </FlexItem>
              <FlexItem>
                <Content component="small" className="pf-v6-u-color-200">
                  Updated {refreshTime === 'Just now' ? 'just now' : refreshTime}
                </Content>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
        <Content component="p" data-testid="infrastructure-workloads-description">
          {WORKLOADS_PAGE_DESCRIPTION}
        </Content>
      </StackItem>
      <StackItem>
        <ProjectSelector
          namespace={preferredProject?.metadata.name ?? ''}
          onSelection={handleProjectSelection}
          showTitle
        />
      </StackItem>
    </Stack>
  );
};

export default InfrastructureWorkloadsSection;
