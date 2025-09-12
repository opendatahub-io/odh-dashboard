/* eslint-disable camelcase */
import React from 'react';
import {
  Popover,
  Button,
  Stack,
  StackItem,
  Content,
  Flex,
  FlexItem,
  List,
  ListItem,
} from '@patternfly/react-core';
import { LineageNode } from '@odh-dashboard/internal/components/lineage/types';
import { useLineageClick } from '@odh-dashboard/internal/components/lineage/LineageClickContext';
import { useNavigate } from 'react-router-dom';
import {
  featureDataSourceRoute,
  featureEntityRoute,
  featureServiceRoute,
  featureViewRoute,
} from '../../../routes.ts';
import { useFeatureStoreProject } from '../../../FeatureStoreContext.tsx';
import { FsObjectType, getEntityTypeIcon } from '../../../utils/featureStoreObjects.tsx';

export interface FeatureStoreLineageNodePopoverProps {
  node: LineageNode | null;
  isVisible: boolean;
  onClose: () => void;
  isOnFeatureViewDetailsPage?: boolean;
}

const getFsObjectTypeLabel = (fsObjectType: FsObjectType): string => {
  const typeLabels: Record<FsObjectType, string> = {
    entity: 'Entity details',
    data_source: 'Data source details',
    feature_view: 'Feature view details',
    feature_service: 'Feature service details',
  };
  return typeLabels[fsObjectType] || fsObjectType;
};

const goToDetailsPage = (node: LineageNode, project: string): string | undefined => {
  const { fsObjectTypes } = node;
  switch (fsObjectTypes) {
    case 'entity':
      return featureEntityRoute(node.name, project);
    case 'data_source':
      return featureDataSourceRoute(node.name, project);
    case 'feature_view':
      return featureViewRoute(node.name, project);
    case 'feature_service':
      return featureServiceRoute(node.name, project);
    default:
      return undefined;
  }
};

const FeatureStoreLineageNodePopover: React.FC<FeatureStoreLineageNodePopoverProps> = ({
  node,
  isVisible,
  onClose,
  isOnFeatureViewDetailsPage = false,
}) => {
  const { currentProject } = useFeatureStoreProject();
  const navigate = useNavigate();

  // Drag tracking is now handled in useLineagePopover hook

  // Conditional rendering after all hooks
  if (!node || !isVisible || !currentProject) {
    return null;
  }

  const { getLastClickPosition } = useLineageClick();
  const clickPosition = getLastClickPosition();
  const triggerElement = clickPosition?.pillElement;

  if (!triggerElement) {
    return null;
  }

  const popoverContent = (
    <Popover
      isVisible={isVisible}
      shouldClose={() => onClose()}
      minWidth="320px"
      maxWidth="480px"
      position="top"
      enableFlip
      triggerRef={{ current: triggerElement }}
      bodyContent={
        <Stack hasGutter style={{ minWidth: '280px' }}>
          {node.description && (
            <StackItem>
              <Content>{node.description}</Content>
            </StackItem>
          )}

          {node.features && node.features.length > 0 && (
            <StackItem>
              <Content>
                <strong>Features ({node.features.length}):</strong>
              </Content>
              <List>
                {node.features.map((feature, index) => (
                  <ListItem key={index}>
                    <strong>{feature.name}</strong>
                    {feature.valueType && (
                      <span style={{ color: '#6a6e73' }}> ({feature.valueType})</span>
                    )}
                    {feature.description && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#6a6e73',
                          marginTop: '2px',
                          lineHeight: '1.3',
                        }}
                      >
                        {feature.description}
                      </div>
                    )}
                  </ListItem>
                ))}
              </List>
            </StackItem>
          )}
        </Stack>
      }
      headerContent={
        <Flex>
          <FlexItem>{getEntityTypeIcon(node.entityType)}</FlexItem>
          <FlexItem>{node.label}</FlexItem>
        </Flex>
      }
      footerContent={
        <Flex>
          {!isOnFeatureViewDetailsPage && (
            <FlexItem>
              <Button
                variant="secondary"
                onClick={() => {
                  const route = goToDetailsPage(node, currentProject);
                  if (route) {
                    navigate(route);
                  }
                }}
              >
                View {getFsObjectTypeLabel(node.fsObjectTypes)} details page
              </Button>
            </FlexItem>
          )}
          {node.fsObjectTypes === 'feature_view' && (
            <FlexItem>
              <Button
                variant="link"
                onClick={() => {
                  const searchParams = new URLSearchParams();
                  searchParams.set('featureView', node.name);
                  navigate(`/featureStore/features/${currentProject}?${searchParams.toString()}`);
                }}
              >
                View all features
              </Button>
            </FlexItem>
          )}
        </Flex>
      }
    >
      {/* Empty div since we're using triggerRef */}
      <div />
    </Popover>
  );

  // Render directly in the overlay container (no portal needed now)
  return popoverContent;
};

export default FeatureStoreLineageNodePopover;
