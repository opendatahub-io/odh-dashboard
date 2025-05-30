import * as React from 'react';
import { List, ListComponent, ListItem, OrderType } from '@patternfly/react-core';
import { BaseSection } from '#~/pages/pipelines/global/modelCustomization/landingPage/BaseSection';
import './LabMethodDescriptionSection.scss';

export const LabMethodDescriptionSection: React.FC = () => (
  <BaseSection title="The LAB method consists of 3 components:">
    <List component={ListComponent.ol} type={OrderType.number} className="odh-bold-list">
      <ListItem>
        <b>Taxonomy-driven data curation:</b> A taxonomy is a diverse set of human-curated data
        consisting of knowledge and skills. This data is used to train the model.
      </ListItem>
      <ListItem>
        <b>Large-scale synthetic data generation (SDG):</b> A teacher model is used to generate new
        examples based on the seed training data. Because synthetic data can vary in quality, the
        LAB method adds an automated step to refine the example answers, ensuring their accuracy.
      </ListItem>
      <ListItem>
        <b>Iterative, large-scale alignment tuning:</b> Finally, the model is retrained based on the
        set of synthetic data. The LAB method includes 2 tuning types: knowledge tuning, and skills
        tuning.
      </ListItem>
    </List>
  </BaseSection>
);
