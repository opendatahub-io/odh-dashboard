import React from 'react';
import '@patternfly/react-core/dist/styles/base.css';
import {
  Nav,
  NavItem,
  NavList,
  Page,
  PageHeader,
  PageSidebar,
  SkipToContent,
  PageSection,
  PageSectionVariants,
  Grid,
  GridItem
} from '@patternfly/react-core';
import { Card, Button, CardBody, CardFooter,Brand,Avatar,CardHeaderMain, CardHeader } from '@patternfly/react-core';
//import accessibleStyles from '@patternfly/react-styles/css/utilities/Accessibility/accessibility';
//import spacingStyles from '@patternfly/react-styles/css/utilities/Spacing/spacing';
//import { css } from '@patternfly/react-styles';
import imgOpenShift from './openShift.svg'
import imgJupyter from './jupyterHublogo.svg'
import imgSpark from './spark.png'
import imgKubeFlow from './kubeflowPng.png'
import imgGrafana from './grafana.png'
import imgAirflow from './airflow-2.png'
import imgLogo from './opendatahub.png'
import imgAvatar from './redHat.png'
import imgArgo from './argo-2.png'
import imgSeldon from './seldon.jpg'
import { ExternalLinkSquareAltIcon } from '@patternfly/react-icons';


  const PageNav = (
    <Nav theme="light">
      <NavList>
        <NavItem>
            <h1>Applications</h1>
        </NavItem>
        <NavItem>
        <h1>Products</h1>
        </NavItem>
      </NavList>
    </Nav>
  );

  
  const Header = (
    <PageHeader
      logo={<Brand src={imgLogo} alt="ODH Logo" style={{ height: '100px' }}/>}
      avatar={<Avatar src={imgAvatar} alt="Avatar image" style={{ height: '100px' }} />}
    />
  );
  const Sidebar = <PageSidebar nav={PageNav} theme="light" />;
  const pageId = 'main-content-page-layout-default-nav';
  const PageSkipToContent = <SkipToContent href={`#${pageId}`}>Skip to content</SkipToContent>;

function App() {
  return (
    <React.Fragment>
    <Page
          header={Header}
          skipToContent={PageSkipToContent}
          mainContainerId={pageId}
        >
    <PageSection variant={PageSectionVariants.light}>      
    <Grid hasGutter>
    <GridItem span={3} style={{ borderStyle:"solid", borderColor:"#00264d" ,backgroundColor:"#E0E9F3", margin:"10px 10px 10px 10px", padding:"10px" }}>
    <Card isHoverable>
    <CardHeader>
          <CardHeaderMain>
            <Brand src={imgJupyter} alt="Jupyter logo" style={{ height: '100px' }}/>
          </CardHeaderMain>
    </CardHeader>  
    <CardBody>
    Jupyter Notebooks provide a way of creating and sharing documents containing live code, visualisations
    </CardBody><br />
    <CardFooter>
    <Button component="a" variant="link" href="https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login" target="_blank" icon={<ExternalLinkSquareAltIcon />} iconPosition="right">
      Launch Jupyter 
    </Button>
    </CardFooter>
    </Card>
    </GridItem>


    <GridItem span={3} style={{ borderStyle:"solid", borderColor:"#00264d" ,backgroundColor:"#e6f2ff", margin:"10px 10px 10px 10px", padding:"10px" }}>
    <Card isHoverable>
    <CardHeader>
          <CardHeaderMain>
            <Brand src={imgSpark} alt="Spark logo" style={{ height: '100px',marginLeft:'20%' }}/>
          </CardHeaderMain>
    </CardHeader>  
    <CardBody>
      Apache Spark is an open-source distributed general-purpose cluster-computing framework written in Scala
    </CardBody><br />
    <CardFooter>
    <Button component="a" variant="link" href="https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login" target="_blank" icon={<ExternalLinkSquareAltIcon />}>
     Launch Spark 
    </Button>
    </CardFooter>
    </Card>
    </GridItem>

     
    <GridItem span={3} style={{ borderStyle:"solid", borderColor:"#00264d" ,backgroundColor:"#e6f2ff", margin:"10px 10px 10px 10px", padding:"10px" }}>
    <Card isHoverable>
    <CardHeader>
          <CardHeaderMain>
            <Brand src={imgKubeFlow} alt="Kubeflow logo" style={{ height: '100px', marginLeft:'70%'}}/>
          </CardHeaderMain>
    </CardHeader>  

    <CardBody>
    The Kubeflow project is dedicated to making deployments of machine learning (ML) workflows on Kubernetes developed by Google in 2017
    </CardBody><br />
    <CardFooter>
    <Button component="a" variant="link" href="https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login" target="_blank" icon={<ExternalLinkSquareAltIcon />}>
     Launch KubeFlow 
    </Button>
    </CardFooter>
    </Card>
    </GridItem>


    <GridItem span={3} style={{ borderStyle:"solid", borderColor:"#00264d" ,backgroundColor:"#e6f2ff", margin:"10px 10px 10px 10px", padding:"10px" }}>
    <Card isHoverable>
    <CardHeader>
          <CardHeaderMain>
            <Brand src={imgOpenShift} alt="Openshift logo" style={{ height: '100px', marginLeft:'70%' }}/>
          </CardHeaderMain>
    </CardHeader>  
    <CardBody>
      OpenShift is a family of containerization software developed by Red Hat - flagship product is the OpenShift Container Platform
    </CardBody><br />
    <CardFooter>
    <Button component="a" variant="link" href="https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login" target="_blank" icon={<ExternalLinkSquareAltIcon />}>
     Launch OpenShift 
    </Button>
    </CardFooter>
        </Card>
    </GridItem>


    <GridItem span={3} style={{ borderStyle:"solid", borderColor:"#00264d" ,backgroundColor:"#e6f2ff", margin:"10px 10px 10px 10px", padding:"10px" }}>
    <Card isHoverable>
    <CardHeader>
          <CardHeaderMain>
            <Brand src={imgGrafana} alt="Grafana logo" style={{ height: '100px', marginLeft: '50%' }}/>
          </CardHeaderMain>
    </CardHeader>  
    <CardBody>
    Grafana is a multi-platform open source analytics and interactive visualization web application written in Go
    </CardBody><br />
    <CardFooter>
    <Button component="a" variant="link" href="https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login" target="_blank" icon={<ExternalLinkSquareAltIcon />}>
     Launch Grafana 
    </Button>
    </CardFooter>
    </Card>
    </GridItem>
    <GridItem span={3} style={{ borderStyle:"solid", borderColor:"#00264d" ,backgroundColor:"#e6f2ff", margin:"10px 10px 10px 10px", padding:"10px" }}>
    <Card isHoverable>
    <CardHeader>
          <CardHeaderMain>
            <Brand src={imgAirflow} alt="Airflow logo" style={{ height: '100px', marginLeft: '10%'}}/>
          </CardHeaderMain>
    </CardHeader>  

    <CardBody>
    Apache Airflow is a workflow automation and scheduling system that can be used to manage data pipelines
    </CardBody><br />
    <CardFooter>
    <Button component="a" variant="link" href="https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login" target="_blank" icon={<ExternalLinkSquareAltIcon />}>
     Launch Airflow 
    </Button>
    </CardFooter>
    </Card>
    </GridItem>
    <GridItem span={3} style={{ borderStyle:"solid", borderColor:"#00264d" ,backgroundColor:"#e6f2ff", margin:"10px 10px 10px 10px", padding:"10px" }}>
    <Card isHoverable>
    <CardHeader>
          <CardHeaderMain>
            <Brand src={imgArgo} alt="Argo logo" style={{ height: '130px', marginLeft:'50%' }}/>
          </CardHeaderMain>
    </CardHeader>  

    <CardBody>
    Argo Workflows is an open source container-native workflow engine
    </CardBody><br />
    <CardFooter>
    <Button component="a" variant="link" href="http://argo-portal-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/workflows" target="_blank" icon={<ExternalLinkSquareAltIcon />}>
     Launch Argo 
    </Button>
    </CardFooter>
    </Card>
    </GridItem>


    <GridItem span={3} style={{ borderStyle:"solid", borderColor:"#00264d" ,backgroundColor:"#e6f2ff", margin:"10px 10px 10px 10px", padding:"10px" }}>
    <Card isHoverable>
    <CardHeader>
          <CardHeaderMain>
            <Brand src={imgSeldon} alt="Seldon logo" style={{ height: '100px' }}/>
          </CardHeaderMain>
    </CardHeader>  

    <CardBody>
    The Seldon orchestrates all ML deployments providing functionality for monitoring and operations of ML systems
    </CardBody><br />
    <CardFooter>
    <Button component="a" variant="link" href="https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login" target="_blank" icon={<ExternalLinkSquareAltIcon />}>
     Launch Seldon 
    </Button>
    </CardFooter>
    </Card>
	</GridItem>
       </Grid>   
    </PageSection>
    </Page>
    </React.Fragment>
       )}




export default App;
