# Set up local development with kubeflow

**Note: this should only be needed in edge cases in which we need to test a local integration with the kubeflow dashboard.**

## Prerequisites

- [Kubeflow repo](https://github.com/kubeflow/kubeflow/tree/master/components/centraldashboard#development)
- [Mod Arch repo](../README.md)

## Setup

### Kubeflow repo (under centraldashboard)

1. Change the [webpack config](https://github.com/kubeflow/kubeflow/blob/master/components/centraldashboard/webpack.config.js#L186) proxies to allow Mod Arch:

```js
// Add this to your webpack.config.js devServer options
module.exports = {
  devServer: {
    proxy: {
      '/mod-arch': {
        target: 'http://localhost:9000',
        pathRewrite: { '^/mod-arch': '' },
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
};
```

2. Run the centraldashboard:

```shell
npm run dev
```

### Mod Arch repo

1. Just run the repo in kubeflow dev mode

```shell
make dev-start-kubeflow
```

### Access the cluster

You need to have a kubeflow cluster up and running, to get the Mod Arch working you'll need to port-forward these two services:

```shell
kubectl port-forward service/mod-arch-service 8085:8080 -n <targeted-namespace-of-the-mr-service>
```

```shell
kubectl port-forward svc/profiles-kfam 8081:8081 -n kubeflow
```

After setting up port forwarding, you can access the UI by navigating to:  

http://localhost:8080
