import React from 'react';
import {
  PageSection,
  Content,
  ContentVariants,
  Card,
  CardBody,
  List,
  ListItem,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';

const ScaffoldPage: React.FC = () => (
  <PageSection hasBodyWrapper={false}>
    <Content component={ContentVariants.h1}>Scaffold Plugin</Content>
    <Content component={ContentVariants.p}>
      This page validates that the RHAII distribution pattern is working correctly. The extension
      loading pipeline, provider wiring, and webpack config sharing are all functioning if you can
      see this page.
    </Content>
    <Card>
      <CardBody>
        <List isPlain>
          <ListItem icon={<CheckCircleIcon />}>
            Extension point pipeline (navigation + routing) is wired
          </ListItem>
          <ListItem icon={<CheckCircleIcon />}>
            Base shell components are importable from rhaii
          </ListItem>
          <ListItem icon={<CheckCircleIcon />}>
            Webpack config sharing via webpack-merge works
          </ListItem>
          <ListItem icon={<CheckCircleIcon />}>
            PluginStore + ExtensibilityContext loads extensions
          </ListItem>
        </List>
      </CardBody>
    </Card>
  </PageSection>
);

export default ScaffoldPage;
