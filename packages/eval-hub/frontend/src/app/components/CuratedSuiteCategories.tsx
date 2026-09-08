import * as React from 'react';
import { Card, CardBody, Content, Grid, GridItem, Title } from '@patternfly/react-core';
import {
  CodeIcon,
  CpuIcon,
  LinkIcon,
  ShieldAltIcon,
  StarIcon,
  WrenchIcon,
} from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { evaluationCollectionsRoute } from '~/app/routes';
import './CuratedSuiteCategories.scss';

type CuratedCategory = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  aiEntities?: string[];
  domains?: string[];
};

const CURATED_CATEGORIES: CuratedCategory[] = [
  {
    id: 'agents',
    title: 'Agents',
    description:
      'Evaluate AI agent behavior, tool usage, and multi-step task completion across various scenarios.',
    icon: LinkIcon,
    iconColor: 'purple',
    aiEntities: ['agent'],
  },
  {
    id: 'models',
    title: 'Models',
    description:
      'Benchmark model accuracy, latency, and quality across standard and custom evaluation datasets.',
    icon: CpuIcon,
    iconColor: 'red',
    aiEntities: ['model'],
  },
  {
    id: 'traces',
    title: 'Traces',
    description:
      'Analyze execution traces to identify performance bottlenecks, errors, and unexpected behaviors.',
    icon: CodeIcon,
    iconColor: 'blue',
    aiEntities: ['trace'],
  },
  {
    id: 'guardrails',
    title: 'Guardrails',
    description:
      'Test safety policies, content filters, and compliance rules to ensure responsible AI outputs.',
    icon: ShieldAltIcon,
    iconColor: 'yellow',
    domains: ['guardrails'],
  },
  {
    id: 'agent-tools',
    title: 'Agent tools',
    description:
      'Evaluate agent tool selection, invocation, and output quality across common tool-use scenarios.',
    icon: WrenchIcon,
    iconColor: 'purple',
    domains: ['agent_tools'],
  },
  {
    id: 'agent-skills',
    title: 'Agent skills',
    description:
      'Evaluate agent skills for task planning, reasoning, and adapting behavior across multi-step workflows.',
    icon: StarIcon,
    iconColor: 'teal',
    domains: ['agent_skills'],
  },
];

const getCategoryHref = (namespace: string, category: CuratedCategory): string => {
  const params = new URLSearchParams({ scope: 'curated' });
  if (category.aiEntities) {
    params.set('ai_entities', category.aiEntities.join(','));
  }
  if (category.domains) {
    params.set('domains', category.domains.join(','));
  }
  return `${evaluationCollectionsRoute(namespace)}?${params.toString()}`;
};

type CuratedSuiteCategoriesProps = {
  namespace: string;
};

const CuratedSuiteCategories: React.FC<CuratedSuiteCategoriesProps> = ({ namespace }) => (
  <section className="evalhub-curated-suite-categories" data-testid="curated-suite-categories">
    <Title headingLevel="h2" size="lg" className="evalhub-curated-suite-categories__title">
      Red Hat curated suites to save as your own
    </Title>
    <Content component="p" className="evalhub-curated-suite-categories__description">
      Select the type of resource you want to evaluate.
    </Content>
    <Grid hasGutter>
      {CURATED_CATEGORIES.map((category) => {
        const Icon = category.icon;
        return (
          <GridItem key={category.id} sm={12} md={6} lg={4}>
            <Link
              to={getCategoryHref(namespace, category)}
              className="evalhub-curated-suite-categories__link"
              data-testid={`curated-suite-category-card-${category.id}`}
            >
              <Card isFullHeight className="evalhub-curated-suite-categories__card">
                <CardBody>
                  <span
                    className={`evalhub-curated-suite-categories__icon evalhub-curated-suite-categories__icon--${category.iconColor}`}
                    aria-hidden="true"
                  >
                    <Icon />
                  </span>
                  <Title
                    headingLevel="h3"
                    size="md"
                    className="evalhub-curated-suite-categories__card-title"
                  >
                    {category.title}
                  </Title>
                  <Content
                    component="p"
                    className="evalhub-curated-suite-categories__card-description"
                  >
                    {category.description}
                  </Content>
                </CardBody>
              </Card>
            </Link>
          </GridItem>
        );
      })}
    </Grid>
  </section>
);

export default CuratedSuiteCategories;
