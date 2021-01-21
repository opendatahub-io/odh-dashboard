export const navData = [
  { id: 'apps', label: 'Applications', href: '/' },
  {
    group: { id: 'gs', title: 'Getting Started' },
    children: [
      { id: 'jupyter', label: 'Jupyter', href: '/gs/jupyter' },
      { id: 'argo', label: 'Argo', href: '/gs/argo' },
      { id: 'prometheus', label: 'Prometheus', href: '/gs/prometheus' },
      { id: 'grafana', label: 'Grafana', href: '/gs/grafana' },
      { id: 'spark', label: 'Spark', href: '/gs/spark' },
      { id: 'seldon', label: 'Seldon', href: '/gs/seldon' },
      { id: 'kafka', label: 'Kafka', href: '/gs/kafka' },
      { id: 'airflow', label: 'Airflow', href: '/gs/airflow' },
    ],
  },
  {
    group: { id: 'docs', title: 'Documentation' },
    children: [
      { id: 'jupyter', label: 'Jupyter', href: '/docs/jupyter' },
      { id: 'argo', label: 'Argo', href: '/docs/argo' },
      { id: 'prometheus', label: 'Prometheus', href: '/docs/prometheus' },
      { id: 'grafana', label: 'Grafana', href: '/docs/grafana' },
      { id: 'spark', label: 'Spark', href: '/docs/spark' },
      { id: 'seldon', label: 'Seldon', href: '/docs/seldon' },
      { id: 'kafka', label: 'Kafka', href: '/docs/kafka' },
      { id: 'airflow', label: 'Airflow', href: '/docs/airflow' },
    ],
  },
];
