import * as React from 'react';
import {
  Button,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardHeaderMain,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  List,
  ListItem,
  Progress,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import '../DataProjects.scss';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { mockImages, mockSizeDescriptions } from '../mockData';
import {
  getDescriptionForTag,
  getTagForImage,
  getNameVersionString,
} from '../../../utilities/imageUtils';
import ImageTagPopover from '../spawner/ImageTagPopover';

type EnvironmentCardProps = {
  environment: any;
  setModalOpen: (isOpen: boolean) => void;
  setActiveEnvironment: (environment: any) => void;
  onDelete: (environment: any) => void;
};

const EnvironmentCard: React.FC<EnvironmentCardProps> = React.memo(
  ({ environment, setModalOpen, setActiveEnvironment, onDelete }) => {
    // const image = mockImages.find((image) => image.name === environment.image.name);
    // if (!image || !image.tags) {
    //   return (
    //     <div className="odh-data-projects__drawer-panel-environment">Environment not available</div>
    //   );
    // }
    const tag = ''; //getTagForImage(image, environment.image.name, environment.image.tag);
    const tagDescription = ''; //getDescriptionForTag(tag);
    const tagDependencies = []; //tag?.content?.dependencies ?? [];
    const sizeDescription = ''; //mockSizeDescriptions[`size/${environment.size}`];

    const containers = environment?.spec?.template?.spec?.containers;
    const image = !containers
      ? null
      : containers.find((container) => container.name === environment.name);

    const getAnnotation = (annotationKey: string): string => {
      return environment?.metadata?.annotations?.[annotationKey];
    };

    return (
      <Card isFlat className="odh-data-projects__details-card">
        <CardHeader>
          <CardHeaderMain>
            <Flex>
              <FlexItem>
                <CardTitle>{environment.metadata.name}</CardTitle>
              </FlexItem>
              <Flex>
                {/*<FlexItem>*/}
                {/*  <Button*/}
                {/*    variant="link"*/}
                {/*    isInline*/}
                {/*    onClick={() => {*/}
                {/*      setActiveEnvironment(environment);*/}
                {/*      setModalOpen(true);*/}
                {/*    }}*/}
                {/*  >*/}
                {/*    Edit*/}
                {/*  </Button>*/}
                {/*</FlexItem>*/}
                {/*<FlexItem>*/}
                {/*  <Button variant="link" isInline>*/}
                {/*    Duplicate*/}
                {/*  </Button>*/}
                {/*</FlexItem>*/}
                <FlexItem>
                  <Button variant="link" isInline onClick={() => onDelete(environment)}>
                    Delete
                  </Button>
                </FlexItem>
              </Flex>
            </Flex>
          </CardHeaderMain>
          <CardActions>
            <Button variant="secondary">Run</Button>
            <Button
              component="a"
              href={getAnnotation('opendatahub.io/link')}
              target="_blank"
              variant="primary"
            >
              Open
            </Button>
          </CardActions>
        </CardHeader>
        <CardBody>
          <DescriptionList isHorizontal isCompact>
            <DescriptionListGroup>
              <DescriptionListTerm>Description</DescriptionListTerm>
              <DescriptionListDescription>
                {getAnnotation('opendatahub.io/description')}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Notebook image</DescriptionListTerm>
              <DescriptionListDescription>
                <span className="odh-data-projects__notebook-image-title">
                  {image?.display_name}
                  {image?.description ? (
                    <ImageTagPopover tag={tag} description={image?.description} />
                  ) : null}
                </span>
                {tagDescription ? (
                  <p className="odh-data-projects__drawer-panel-environment-help-text">
                    {tagDescription}
                  </p>
                ) : null}
              </DescriptionListDescription>
            </DescriptionListGroup>
            {tagDescription && tagDependencies.length ? (
              <DescriptionListGroup>
                <DescriptionListTerm>Packages</DescriptionListTerm>
                <DescriptionListDescription>
                  {tagDependencies?.map((dependency) => (
                    <p key={dependency?.name}>{getNameVersionString(dependency)}</p>
                  ))}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ) : null}
            <DescriptionListGroup>
              <DescriptionListTerm>Container Size</DescriptionListTerm>
              <DescriptionListDescription>
                <List isPlain>
                  <ListItem>
                    <p>{environment.size}</p>
                    <p className="odh-data-projects__drawer-panel-environment-help-text">
                      {`${sizeDescription?.resources?.limits?.cpu} CPU, ${sizeDescription?.resources?.limits?.memory} Memory`}
                    </p>
                  </ListItem>
                  <ListItem>
                    <p>Memory Requests</p>
                    <p className="odh-data-projects__drawer-panel-environment-help-text">
                      {`${sizeDescription?.resources?.requests?.cpu} CPU, ${sizeDescription?.resources?.requests?.memory} Memory`}
                    </p>
                  </ListItem>
                </List>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Storage</DescriptionListTerm>
              <DescriptionListDescription>
                <List isPlain>
                  <ListItem>
                    <Flex>
                      <FlexItem>{environment?.storage?.name}</FlexItem>
                      <FlexItem align={{ default: 'alignRight' }}>
                        <Button variant="link" isSmall isInline>
                          Access
                        </Button>
                      </FlexItem>
                    </Flex>
                  </ListItem>
                  <ListItem>
                    <Split hasGutter>
                      <SplitItem>
                        <span>{environment?.storage?.used}</span>
                      </SplitItem>
                      <SplitItem isFilled>
                        <Progress
                          measureLocation="outside"
                          value={87.5}
                          label={environment?.storage?.total}
                        />
                      </SplitItem>
                    </Split>
                  </ListItem>
                  <ListItem>
                    <Button variant="link" icon={<PlusCircleIcon />} isSmall isInline>
                      Add storage
                    </Button>
                  </ListItem>
                </List>
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </CardBody>
      </Card>
    );
  },
);

EnvironmentCard.displayName = 'EnvironmentCard';

export default EnvironmentCard;
