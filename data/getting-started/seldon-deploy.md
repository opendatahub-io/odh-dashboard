# Seldon Deploy

[Seldon Deploy](https://deploy.seldon.io) provides oversight and governance for machine learning deployments.

Seldon Deploy builds on top of [Seldon Core](https://deploy.seldon.io/docs/about/), an open source platform for deploying machine learning models on a Kubernetes cluster.

Deployments in Seldon Deploy can be SeldonDeployments, which are [Seldon Core resources](https://docs.seldon.io/en/latest/).

Seldon Core is an open source operator and custom resource (the SeldonDeployment) for deploying models. Models can be built in different toolkits, packaged by either serializing or dockerising and then deployed to kubernetes in SeldonDeployments.

Features include:

* Integrations to gateways for progressive rollout strategies such as canary and A/B test.
* Graphs for pre-process and post-process steps
* Integration to elasticsearch for audit trails of requests
* Integration to prometheus for monitoring
* Ways to deploy explainers, outlier detectors and drift detectors for advanced monitoring

Seldon Deploy adds a user interface for easily deploying, monitoring and managing models. It adds enterprise functionality such as user roles and permissions, overall resource usage and integrations such as gitops.

## Installing Seldon Deploy

Seldon Deploy has a Red Hat marketplace listing. That install includes Red Hat versions of required sub-components such as Seldon Core.

Documentation on the Seldon Deploy Red Hat marketplace install is at [https://deploy-master.seldon.io/docs/getting-started/redhat-installation/](https://deploy-master.seldon.io/docs/getting-started/redhat-installation/)

### Subscribe to the operator on Marketplace
- [https://marketplace.redhat.com/en-us/products/seldon-deploy](https://marketplace.redhat.com/en-us/products/seldon-deploy)
### Install the operator and validate
- [https://marketplace.redhat.com/en-us/documentation/operators](https://marketplace.redhat.com/en-us/documentation/operators)
