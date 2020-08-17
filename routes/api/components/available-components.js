module.exports = [
  {
    label: "JupyterHub",
    description:
      "Jupyter Notebooks provide a way of creating and sharing documents containing live code, visualisations",
    kfdefApplications: ["jupyterhub", "notebook-images"],
    route: "jupyterhub",
    img: "images/jupyterhub.svg",
  },
  {
    label: "Argo",
    description:
      "Argo Workflows is an open source container-native workflow engine for orchestrating parallel jobs on Kubernetes",
    kfdefApplications: ["odhargo-cluster", "odhargo"],
    route: "argo-portal",
    img: "images/argo.png",
  },
  {
    label: "Superset",
    description:
      "Apache Superset is an open-source software for data exploration and data visualization able to handle large amount of data",
    kfdefApplications: ["superset"],
    route: "superset",
    img: "images/apache-superset.jpeg",
  },
  {
    label: "Prometheus",
    description:
      "An open-source monitoring system with a dimensional data model, flexible query language, efficient time series database and modern alerting approach",
    kfdefApplications: ["prometheus-cluster", "prometheus-operator"],
    route: "prometheus-portal",
    img: "images/prometheus.png",
  },
  {
    label: "Grafana",
    description:
      "Grafana is a multi-platform open source analytics and interactive visualization web application written in Go",
    kfdefApplications: ["grafana-cluster", "grafana-instance"],
    route: "grafana-route",
    img: "images/grafana.png",
  },
  {
    label: "Apache Spark",
    description:
      "Apache Spark is an open-source distributed general-purpose cluster-computing framework written in Scala",
    kfdefApplications: [
      "radanalyticsio-cluster",
      "radanalyticsio-spark-operator",
    ],
    route: null,
    img: "images/apache-spark.svg",
  },
  {
    label: "Seldon",
    description:
      "The Seldon orchestrates all ML deployments providing functionality for monitoring and operations of ML systems",
    kfdefApplications: ["odhseldon"],
    route: null,
    img: "images/seldon.png",
  },
  {
    label: "Kafka",
    description:
      "Apache Kafka is an open-source stream-processing software platform developed by the Apache Software Foundation, written in Scala and Java",
    kfdefApplications: ["strimzi-operator", "kafka-cluster"],
    route: null,
    img: "images/apache-kafka.svg",
  },
  {
    label: "Apache Airflow",
    description:
      "Apache Airflow is a workflow automation and scheduling system that can be used to manage data pipelines",
    kfdefApplications: ["airflow-cluster", "airflow-operator"],
    route: null,
    img: "images/apache-airflow.svg",
  },
];
