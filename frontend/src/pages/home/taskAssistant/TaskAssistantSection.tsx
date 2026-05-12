import React from 'react';
import {
  Button,
  Card,
  CardBody,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  PageSection,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import taskAssistantIllustration from '#~/images/Illustration-Learning_path-Teal-RH.svg';
import TaskGroupCard from './TaskGroupCard';
import TaskAssistantPillBar from './TaskAssistantPillBar';
import TaskAssistantSearchDropdown from './TaskAssistantSearchDropdown';
import useTaskAssistantData from './useTaskAssistantData';

const STORAGE_KEY = 'odh.home.task-assistant.open';

const TaskAssistantSection: React.FC = () => {
  const [isOpen, setIsOpen] = useBrowserStorage<boolean>(STORAGE_KEY, true, true, false);
  const { groups, groupedTasks, resolved } = useTaskAssistantData();
  const scrollTargetRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isOpen && scrollTargetRef.current) {
      const targetId = scrollTargetRef.current;
      scrollTargetRef.current = null;
      requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [isOpen]);

  const handlePillClick = React.useCallback(
    (groupId: string) => {
      scrollTargetRef.current = `task-group-${groupId}`;
      setIsOpen(true);
    },
    [setIsOpen],
  );

  if (!resolved || groups.length === 0) {
    return null;
  }

  const titleId = 'task-assistant-title';

  return (
    <PageSection variant="secondary" hasBodyWrapper={false} data-testid="task-assistant-section">
      <Card>
        <CardBody
          style={
            isOpen
              ? {
                  backgroundImage: `url(${taskAssistantIllustration})`,
                  backgroundRepeat: 'no-repeat',
                  // aesthetic choice to size andposition the illustration slightly outside the card
                  backgroundPosition: 'calc(100% + 50px) calc(100% + 125px)',
                  backgroundSize: '450px',
                }
              : undefined
          }
        >
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Button
                icon={isOpen ? <AngleDownIcon /> : <AngleRightIcon />}
                aria-labelledby={titleId}
                aria-expanded={isOpen}
                variant="plain"
                className="pf-v6-u-px-0"
                onClick={() => setIsOpen(!isOpen)}
              />
            </FlexItem>
            <FlexItem>
              <HeaderIcon
                type={ProjectObjectType.taskAssistant}
                sectionType={SectionType.general}
              />
            </FlexItem>
            <FlexItem>
              <Content>
                <Content id={titleId} component={ContentVariants.h2}>
                  Task assistant
                </Content>
              </Content>
            </FlexItem>
            {!isOpen ? (
              <FlexItem flex={{ default: 'flex_1' }}>
                <TaskAssistantPillBar
                  groups={groups.map((g) => g.properties)}
                  onPillClick={handlePillClick}
                />
              </FlexItem>
            ) : null}
            <FlexItem align={{ default: 'alignRight' }}>
              <TaskAssistantSearchDropdown
                groups={groups.map((g) => g.properties)}
                tasks={groups.flatMap((g) =>
                  (groupedTasks[g.properties.id] ?? []).map((t) => t.properties),
                )}
              />
            </FlexItem>
          </Flex>
          {isOpen ? (
            <>
              <Content className="pf-v6-u-mt-sm pf-v6-u-mb-md" component="p">
                Task Assistant provides personalized entry points based on your workflow. Select a
                task to get started.
              </Content>
              <Gallery hasGutter minWidths={{ default: '100%', md: '300px' }}>
                {groups.map((group) => (
                  <GalleryItem key={group.properties.id} id={`task-group-${group.properties.id}`}>
                    <TaskGroupCard
                      group={group.properties}
                      tasks={(groupedTasks[group.properties.id] ?? []).map((t) => t.properties)}
                    />
                  </GalleryItem>
                ))}
              </Gallery>
            </>
          ) : null}
        </CardBody>
      </Card>
    </PageSection>
  );
};

export default TaskAssistantSection;
