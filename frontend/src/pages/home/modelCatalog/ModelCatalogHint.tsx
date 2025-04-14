import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Content,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import modelCatalogImg from '~/images/homepage-model-catalog.svg';

const ModelCatalogHint: React.FC<{ isHidden: boolean; setHidden: React.FC }> = ({
  isHidden,
  setHidden,
}) => {
  if (isHidden) {
    return null;
  }

  const hintActions = (
    <Button
      icon={<TimesIcon style={{ fontSize: '0.75em' }} />}
      data-testid="model-catalog-hint-close"
      aria-label="model catalog hint close"
      variant="plain"
      onClick={setHidden}
    />
  );

  const gridImgStyle: React.CSSProperties = {
    height: '100%',
    backgroundSize: '90%',
    backgroundRepeat: 'no-repeat',
    backgroundImage: `url(${modelCatalogImg})`,
    backgroundPosition: 'left',
    marginLeft: '-2em',
  };

  const cardBodyStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 0,
    paddingTop: 0,
    paddingRight: '4em',
  };

  return (
    <Card style={{ height: '100%' }} data-testid="model-catalog-hint">
      <Grid span={12} style={{ height: '100%' }}>
        <GridItem xl2={6} lg={6} md={6} sm={6} span={5} rowSpan={3} style={gridImgStyle} />

        <GridItem rowSpan={1} xl2={6} lg={6} md={6} sm={6} span={7}>
          <CardHeader
            actions={{ actions: hintActions, hasNoOffset: true }}
            style={{ paddingBottom: 0, paddingTop: '0.95em', paddingRight: '0.95em' }}
          />
        </GridItem>
        <GridItem height="100%" xl2={6} lg={6} md={6} sm={6} span={7} rowSpan={2}>
          <CardBody style={cardBodyStyle}>
            <Content>
              Discover models that are available for your organization to register, deploy, and
              customize.
            </Content>
          </CardBody>
        </GridItem>
      </Grid>
    </Card>
  );
};

export default ModelCatalogHint;
