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
import modelCatalogImg from '#~/images/homepage-model-catalog.svg';

const ModelCatalogHint: React.FC<{ isHidden: boolean; setHidden: React.FC }> = ({
  isHidden,
  setHidden,
}) => {
  if (isHidden) {
    return null;
  }

  const hintActions = (
    <Button
      size="sm"
      icon={<TimesIcon />}
      data-testid="model-catalog-hint-close"
      aria-label="model catalog hint close"
      variant="plain"
      onClick={setHidden}
    />
  );

  return (
    <Card isFullHeight data-testid="model-catalog-hint">
      <Grid span={12} style={{ height: '100%' }}>
        <GridItem
          xl2={6}
          lg={6}
          md={6}
          sm={6}
          span={5}
          rowSpan={3}
          style={{
            backgroundSize: '90%',
            backgroundRepeat: 'no-repeat',
            backgroundImage: `url(${modelCatalogImg})`,
            backgroundPosition: 'left',
            marginLeft: '-2em',
          }}
        />

        <GridItem rowSpan={1} xl2={6} lg={6} md={6} sm={6} span={7}>
          <CardHeader actions={{ actions: hintActions }} />
        </GridItem>
        <GridItem xl2={6} lg={6} md={6} sm={6} span={7} rowSpan={2}>
          <CardBody
            style={{
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: '4em',
            }}
          >
            <Content>Discover models that you can register, deploy, and customize.</Content>
          </CardBody>
        </GridItem>
      </Grid>
    </Card>
  );
};

export default ModelCatalogHint;
