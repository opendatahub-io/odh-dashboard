import React, {useState} from "react";
import { PageSection, PageSectionVariants, Grid, GridItem } from "@patternfly/react-core";
import OdhAppCard from "./components/OdhAppCard";



const odhApps = [
  {
    img: require("../images/jupyterhub.svg"),
    altName: "JupyterHub logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Jupyter Notebooks provide a way of creating and sharing documents containing live code, visualisations",
    buttonName: "Launch Jupyter",
  },
  {
    img: require("../images/spark.png"),
    altName: "Spark logo",
    link:"https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Apache Spark is an open-source distributed general-purpose cluster-computing framework written in Scala",
    buttonName: "Launch Spark",
  },
  {
    img: require("../images/kubeflow.png"),
    altName: "Kubeflow logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "The Kubeflow project is dedicated to making deployments of machine learning (ML) workflows on Kubernetes developed by Google in 2017",
    buttonName: "Launch KubeFlow",
  },
  {
    img: require("../images/openshift.svg"),
    altName: "Openshift logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "OpenShift is a family of containerization software developed by Red Hat - flagship product is the OpenShift Container Platform",
    buttonName: "Launch Openshift",
  },
  {
    img: require("../images/grafana.png"),
    altName: "Grafana logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Grafana is a multi-platform open source analytics and interactive visualization web application written in Go",
    buttonName: "Launch Grafana",
  },
  {
    img: require("../images/airflow.png"),
    altName: "Airflow logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Apache Airflow is a workflow automation and scheduling system that can be used to manage data pipelines",
    buttonName: "Launch AirFlow",
  },
  {
    img: require("../images/argo.png"),
    altName: "Argo logo",
    link: "http://argo-portal-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/workflows",
    description:
      "Argo Workflows is an open source container-native workflow engine for orchestrating parallel jobs on Kubernetes",
    buttonName: "Launch Argo",
  },
  {
    img: require("../images/seldon.jpg"),
    altName: "Seldon logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "The Seldon orchestrates all ML deployments providing functionality for monitoring and operations of ML systems",
    buttonName: "Launch Seldon",
  }
];

//const [state, setState] = useState({counter:0});

function Launcher() {

  
  console.log("Hello")
  fetch(`http://localhost:8000/api/getFile`).then(response => response.json())
  .then(response => {
      console.log(response)
  })

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
