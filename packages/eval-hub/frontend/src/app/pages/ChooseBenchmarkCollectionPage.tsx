import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Content,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Gallery,
  Panel,
  PanelMain,
  PanelMainBody,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useCollections } from '~/app/hooks/useCollections';
import { Collection } from '~/app/types';
import { evaluationCreateRoute, evaluationsBaseRoute } from '~/app/routes';

const CollectionDrawerPanel: React.FC<{
  collection: Collection | undefined;
  onClose: () => void;
}> = ({ collection, onClose }) => {
  if (!collection) {
    return null;
  }

  return (
    <DrawerPanelContent isResizable minSize="380px" data-testid="collection-drawer-panel">
      <DrawerHead>
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h2" size="xl">
              {collection.name}
            </Title>
          </StackItem>
          <StackItem>
            {collection.benchmarks && collection.benchmarks.length > 0 && (
              <Content component="small">
                <strong>
                  {collection.benchmarks.length} benchmark
                  {collection.benchmarks.length !== 1 ? 's' : ''}
                </strong>
              </Content>
            )}
          </StackItem>
          {collection.description && (
            <StackItem>
              <Content component="p">{collection.description}</Content>
            </StackItem>
          )}
        </Stack>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody>
        <Stack hasGutter>
          {collection.benchmarks && collection.benchmarks.length > 0 && (
            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Content component="h4">Benchmarks</Content>
                </StackItem>
                {collection.benchmarks.map((b) => (
                  <StackItem key={b.id}>
                    <Panel variant="bordered">
                      <PanelMain>
                        <PanelMainBody>
                          <Stack hasGutter>
                            <StackItem>
                              <strong>{b.id}</strong>
                            </StackItem>
                            {b.provider_id && (
                              <StackItem>
                                <Content component="small">Provider: {b.provider_id}</Content>
                              </StackItem>
                            )}
                            {b.weight !== undefined && (
                              <StackItem>
                                <Content component="small">Weight: {b.weight}</Content>
                              </StackItem>
                            )}
                          </Stack>
                        </PanelMainBody>
                      </PanelMain>
                    </Panel>
                  </StackItem>
                ))}
              </Stack>
            </StackItem>
          )}

          <StackItem>
            <Button variant="primary">Run collection</Button>
          </StackItem>
        </Stack>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

const ChooseBenchmarkCollectionPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const [selectedCollection, setSelectedCollection] = React.useState<Collection | undefined>(
    undefined,
  );

  const { collections, loaded, loadError } = useCollections(namespace ?? '');

  return (
    <Drawer isExpanded={!!selectedCollection} isInline>
      <DrawerContent
        panelContent={
          <CollectionDrawerPanel
            collection={selectedCollection}
            onClose={() => setSelectedCollection(undefined)}
          />
        }
      >
        <DrawerContentBody>
          <ApplicationsPage
            title="Select benchmark suite"
            description="Select a benchmark suite to run on your model, agent or pre-recorded responses."
            breadcrumb={
              <Breadcrumb>
                <BreadcrumbItem
                  render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
                />
                <BreadcrumbItem
                  render={() => (
                    <Link to={evaluationCreateRoute(namespace)}>Create evaluation run</Link>
                  )}
                />
                <BreadcrumbItem isActive>Choose benchmark collection</BreadcrumbItem>
              </Breadcrumb>
            }
            loaded={loaded}
            loadError={loadError}
            empty={false}
          >
            <PageSection hasBodyWrapper={false} isFilled>
              {!loaded ? (
                <Bullseye>
                  <Spinner />
                </Bullseye>
              ) : collections.length === 0 ? (
                <Bullseye>
                  <Content component="p">No collections available.</Content>
                </Bullseye>
              ) : (
                <Gallery hasGutter minWidths={{ default: '280px' }}>
                  {collections.map((collection) => {
                    const benchmarkCount = collection.benchmarks?.length ?? 0;
                    const isSelected = selectedCollection?.resource.id === collection.resource.id;
                    return (
                      <Card
                        key={collection.resource.id}
                        isSelected={isSelected}
                        style={{ cursor: 'pointer' }}
                        data-testid={`collection-card-${collection.resource.id}`}
                        onClick={() => setSelectedCollection(isSelected ? undefined : collection)}
                      >
                        <CardTitle>{collection.name}</CardTitle>
                        <CardBody>
                          {benchmarkCount > 0 && (
                            <Content component="small">
                              <strong>
                                {benchmarkCount} benchmark{benchmarkCount !== 1 ? 's' : ''}
                              </strong>
                            </Content>
                          )}
                          {collection.description && (
                            <Content component="p">{collection.description}</Content>
                          )}
                        </CardBody>
                        <CardFooter>
                          <Button
                            variant="link"
                            isInline
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCollection(collection);
                            }}
                          >
                            Run collection
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </Gallery>
              )}
            </PageSection>
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default ChooseBenchmarkCollectionPage;
