

const fastify = require('fastify')()
const path = require('path')
const {PORT, IP} = require('./utils/constants');


fastify.register(require('fastify-cors'), { 
  origin: true
})

const odhApps = [
  {
    img: "../images/jupyterhub.svg",
    altName: "JupyterHub logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Jupyter Notebooks provide a way of creating and sharing documents containing live code, visualisations",
    buttonName: "Launch Jupyter",
  },
  {
    img: "../images/spark.png",
    altName: "Spark logo",
    link:"https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Apache Spark is an open-source distributed general-purpose cluster-computing framework written in Scala",
    buttonName: "Launch Spark",
  },
  {
    img: "../images/kubeflow.png",
    altName: "Kubeflow logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "The Kubeflow project is dedicated to making deployments of machine learning (ML) workflows on Kubernetes developed by Google in 2017",
    buttonName: "Launch KubeFlow",
  },
  {
    img: "../images/openshift.svg",
    altName: "Openshift logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "OpenShift is a family of containerization software developed by Red Hat - flagship product is the OpenShift Container Platform",
    buttonName: "Launch Openshift",
  },
  {
    img: "../images/grafana.png",
    altName: "Grafana logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Grafana is a multi-platform open source analytics and interactive visualization web application written in Go",
    buttonName: "Launch Grafana",
  },
  {
    img: "../images/airflow.png",
    altName: "Airflow logo",
    link: "https://jupyterhub-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/hub/login",
    description:
      "Apache Airflow is a workflow automation and scheduling system that can be used to manage data pipelines",
    buttonName: "Launch AirFlow",
  },
  {
    img: "../images/argo.png",
    altName: "Argo logo",
    link: "http://argo-portal-odhdemo.apps.hmf.q7z3.p1.openshiftapps.com/workflows",
    description:
      "Argo Workflows is an open source container-native workflow engine for orchestrating parallel jobs on Kubernetes",
    buttonName: "Launch Argo",
  }
];

const Static = require('fastify-static')

fastify.register(Static, {
  root: path.join(__dirname, 'frontend/build'),
  wildcard: false
});

fastify.get('/*', function(req, reply) {
  reply.sendFile('index.html');
});


fastify.get('/api/getFile', function (req, reply) {
  reply.sendFile('odhDataRes.json')
})
/*
const start = async () => {
  try {
      await fastify.listen(3001)
      fastify.log.info(`server listening on ${fastify.server.address().port}`) }
  catch (err) {
      fastify.log.error(err)
      process.exit(1)
  }}
  start()
*/

fastify.get('/demo', (request, reply) => {
  console.log('Fetching demo data')
  reply.send({ hello: 'world' })
})


fastify.listen(PORT, IP, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log('ok')
  console.log(`server listening on ${fastify.server.address().port}`)
})