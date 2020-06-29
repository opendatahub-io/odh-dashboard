import React, {useEffect} from "react";
import { PageSection, PageSectionVariants, Grid, GridItem } from "@patternfly/react-core";
import OdhAppCard from "./components/OdhAppCard";
import imgOpenShift from "../images/openshift.svg";
import imgJupyter from "../images/jupyterhub.svg";
import imgSpark from "../images/spark.png";
import imgKubeFlow from "../images/kubeflow.png";
import imgGrafana from "../images/grafana.png";
import imgAirflow from "../images/airflow.png";
import imgArgo from "../images/argo.png";
import imgSeldon from "../images/seldon.jpg";

const odhApps = [
  {
    img: imgJupyter,
    altName: "JupyterHub logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Jupyter Notebooks provide a way of creating and sharing documents containing live code, visualisations",
    buttonName: "Launch Jupyter",
  },
  {
    img: imgSpark,
    altName: "Spark logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Apache Spark is an open-source distributed general-purpose cluster-computing framework written in Scala",
    buttonName: "Launch Spark",
  },
  {
    img: imgKubeFlow,
    altName: "Kubeflow logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "The Kubeflow project is dedicated to making deployments of machine learning (ML) workflows on Kubernetes developed by Google in 2017",
    buttonName: "Launch KubeFlow",
  },
  {
    img: imgOpenShift,
    altName: "Openshift logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "OpenShift is a family of containerization software developed by Red Hat - flagship product is the OpenShift Container Platform",
    buttonName: "Launch Openshift",
  },
  {
    img: imgGrafana,
    altName: "Grafana logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Grafana is a multi-platform open source analytics and interactive visualization web application written in Go",
    buttonName: "Launch Grafana",
  },
  {
    img: imgAirflow,
    altName: "Airflow logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Apache Airflow is a workflow automation and scheduling system that can be used to manage data pipelines",
    buttonName: "Launch AirFlow",
  },
  {
    img: imgArgo,
    altName: "Argo logo",
    link: "http://argo-portal-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/workflows",
    description:
      "Argo Workflows is an open source container-native workflow engine for orchestrating parallel jobs on Kubernetes",
    buttonName: "Launch Argo",
  },
  {
    img: imgSeldon,
    altName: "Seldon logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "The Seldon orchestrates all ML deployments providing functionality for monitoring and operations of ML systems",
    buttonName: "Launch Seldon",
  },
];

function Launcher() {

  useEffect(() => {
    // GET request using fetch inside useEffect React hook
    fetch('http://localhost:3000/data')
        .then(console.log(response => response.json()))
// empty dependency array means this effect will only run once (like componentDidMount in classes)
}, []);

  return (
    <PageSection variant={PageSectionVariants.light}>
      <Grid hasGutter className="gridItem">
        {odhApps.map((a) => (
          <GridItem span={12} sm={12} md={6} lg={4} xl={3} key={a.altName}>
            <OdhAppCard
              img={a.img}
              link={a.link}
              description={a.description}
              buttonName={a.buttonName}
              altName={a.altName}
            />
          </GridItem>
        ))}
      </Grid>  
    </PageSection>
  );
}

export default Launcher;
