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
  DrawerContent,
  DrawerContentBody,
  Gallery,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { useCollections } from '~/app/hooks/useCollections';
import { Collection } from '~/app/types';
import { evaluationCreateRoute, evaluationStartRoute, evaluationsBaseRoute } from '~/app/routes';
import CollectionDrawerPanel from '~/app/components/CollectionDrawerPanel';

const ChooseBenchmarkCollectionPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const [selectedCollection, setSelectedCollection] = React.useState<Collection | undefined>(
    undefined,
  );

  const { collections, loaded, loadError } = useCollections(namespace ?? '');

  const handleRunCollection = React.useCallback(
    (c: Collection) => {
      const params = new URLSearchParams({
        type: 'collection',
        collectionId: c.resource.id,
      });
      navigate(`${evaluationStartRoute(namespace)}?${params.toString()}`, {
        state: { collection: c },
      });
    },
    [navigate, namespace],
  );

  return (
    <Drawer isExpanded={!!selectedCollection} isInline>
      <DrawerContent
        panelContent={
          <CollectionDrawerPanel
            collection={selectedCollection}
            onClose={() => setSelectedCollection(undefined)}
            onRunCollection={handleRunCollection}
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
                              handleRunCollection(collection);
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
