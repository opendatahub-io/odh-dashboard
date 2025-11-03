# Enabling MCP servers in Open Data Hub

Open Data Hub allows you to enable MCP servers in a cluster. 

This documentations shows how to enable the following MCP servers: 

* [Slack](https://github.com/korotovsky/slack-mcp-server)
* [Google suite](https://github.com/taylorwilsdon/google_workspace_mcp)
* [Kubernetes](https://github.com/containers/kubernetes-mcp-server)
* [Service Now](https://github.com/echelon-ai-labs/servicenow-mcp)

* [GitHub](https://github.com/github/github-mcp-server) - The following documentation does not include a example OpenShift/Kubernetes YAML configuration. The example ConfigMap uses the publicly available GitHub MCP server.

This documentation is experimental and should not be deployed in production environments. 

## Prerequisites

* An existing Open Data Hub cluster 
* Respective tokens based on your desired MCP server

## Procedures

### Setting up images for your MCP server 

Some of the OpenShift/Kubernetes YAML configurations for deploying MCP servers need to reference an image that is built from a Containerfile/Dockerfile. If an MCP server does not include a publicly available image, you may need to build one using the Containerfile or Dockerfile from its source repository. 

* [Slack MCP server Dockerfile](https://github.com/korotovsky/slack-mcp-server/blob/master/Dockerfile)
* [Google Suites MCP server Dockerfile](https://github.com/taylorwilsdon/google_workspace_mcp/blob/main/Dockerfile)
* [Service Now MCP server Dockerfile](https://github.com/echelon-ai-labs/servicenow-mcp/blob/main/Dockerfile)

The Kubernetes MCP server already has a Red Hat-maintained kubernetes-mcp-server image on quay.io.

Build an image from the Containerfile/Dockerfile and push the image to an image registry using the following documentation [How to deploy a web service on OpenShift](https://www.redhat.com/en/blog/deploy-web-service-openshift). The image has to have public permission to be accessible by an OpenShift/Kubernetes cluster.

Once this image is available, you can specify the image path in your OpenShift/Kubernetes deployment configuration. The following example configurations display where to add your image URL. 

#### Configuring Slack MCP server

Open Data Hub allows you to 

1 ) Create a `slack-mcp.yaml` with the following example parameters. Ensure you replace the placeholder values:
* `<your-slack-token>`: Your Slack bot token (used for `SLACK_MCP_XOXP_TOKEN`).
* `<your-slack-mcp-image>`: The image URL you pushed to your registry.

```yaml
# Secret that defines your Slack credentials
apiVersion: v1
kind: Secret
metadata:
  name: slack-credentials
  namespace: opendatahub
  labels:
    app: slack-mcp
type: Opaque
stringData:
  SLACK_MCP_XOXP_TOKEN: "<your-slack-token>"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: slack-mcp
  name: slack-mcp
  namespace: opendatahub
spec:
  progressDeadlineSeconds: 600
  replicas: 2
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: slack-mcp
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: slack-mcp
    spec:
      containers:
        - name: slack-mcp
          image: <your-slack-mcp-image> 
          imagePullPolicy: Always
          env:
            - name: MCP_TRANSPORT
              value: "sse"
            - name: FASTMCP_HOST
              value: "0.0.0.0"
            - name: SLACK_MCP_ADD_MESSAGE_TOOL
              value: "true"
            - name: LOGS_CHANNEL_ID
              value: "C0700000000"
            - name: LOGS_CHANNEL_ID
              value: "C0700000000"
            - name: SLACK_MCP_XOXP_TOKEN
              valueFrom:
                secretKeyRef:
                  name: slack-credentials
                  key: SLACK_MCP_XOXP_TOKEN
          ports:
            - containerPort: 3001
              protocol: TCP
          resources:
            limits:
              cpu: 100m
              memory: 128Mi
            requests:
              cpu: 50m
              memory: 64Mi
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: slack-mcp
  labels:
    app: slack-mcp
  namespace: opendatahub
spec:
  selector:
    app: slack-mcp
  ports:
    - protocol: TCP
      port: 3001
      targetPort: 3001
  type: ClusterIP
```

2 ) Apply the application to your cluster with the following command:

```terminal 
oc apply -f slack-mcp.yaml 
```

#### Configuring a Google Suite MCP server

Open Data Hub allows you to integrate with an MCP server deployed onto your cluster that uses Google Suite tools

1 ) Create a `gsuite-mcp.yaml` with the following example parameters. Ensure to populate the `stringdata` parameter with your Google credentials by following the documentation in the [Google Workspace MCP](https://github.com/taylorwilsdon/google_workspace_mcp) repository. Also ensure you populate the `<your-gsuite-mcp-image>`  parameter with the URL to the image you pushed to an image registry. 

```yaml
# Secret containing your GSuite credential 
apiVersion: v1
kind: Secret
metadata:
  name: gsuite-credentials
  namespace: opendatahub
  labels:
    app: gsuite-mcp
type: Opaque
stringData:
  GOOGLE_OAUTH_CLIENT_ID: "<your-google-client-id>"
  GOOGLE_OAUTH_CLIENT_SECRET: "<your-google-client-secret>"
  GOOGLE_PSE_ENGINE_ID: "<your-pse-engine>"
  USER_GOOGLE_EMAIL: "<your-google-email>"
---
# Deployment that runs your GSuite MCP
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gsuite-mcp
  namespace: opendatahub
  labels:
    app: gsuite-mcp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: gsuite-mcp
  template:
    metadata:
      labels:
        app: gsuite-mcp
    spec:
      containers:
        - name: gsuite-mcp
          image: "<your-gsuite-mcp-image>"
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 8000
          env:
            - name: OAUTHLIB_INSECURE_TRANSPORT
              value: "1" # for dev/testing online
            - name: TOOL_TIER
              value: "complete" # [core | extended | complete]
            - name: MCP_ENABLE_OAUTH21
              value: "false"
            - name: WORKSPACE_MCP_STATELESS_MODE
              value: "false" # required Oauth 2.1
            - name: GOOGLE_OAUTH_CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: gsuite-credentials
                  key: GOOGLE_OAUTH_CLIENT_ID
            - name: USER_GOOGLE_EMAIL
              valueFrom:
                secretKeyRef:
                  name: gsuite-credentials
                  key: USER_GOOGLE_EMAIL
            - name: GOOGLE_OAUTH_CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: gsuite-credentials
                  key: GOOGLE_OAUTH_CLIENT_SECRET
            - name: GOOGLE_PSE_ENGINE_ID
              valueFrom:
                secretKeyRef:
                  name: gsuite-credentials
                  key: GOOGLE_PSE_ENGINE_ID
---
# Service that exposes the server
apiVersion: v1
kind: Service
metadata:
  name: gsuite-mcp
  namespace: opendatahub
  labels:
    app: gsuite-mcp
spec:
  type: ClusterIP
  selector:
    app: gsuite-mcp
  ports:
    - name: http
      port: 8000
      targetPort: http
``` 

2 ) Apply the application to your cluster with the following command:

```terminal
oc apply -f gsuite-mcp.yaml
```

#### Configuring a Kubernetes MCP server 

1 ) Create a `kubernetes-mcp.yaml` file with the following example parameters:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: mcp-server
  namespace: opendatahub
---
# Give the pod read-only access to namespace resources if your MCP server needs to
# read/list things (adjust as needed).
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: mcp-namespace-view
  namespace: opendatahub
rules:
  - apiGroups: [""]
    resources: ["pods","services","endpoints","configmaps","secrets"]
    verbs: ["get","list","watch"]
  - apiGroups: ["apps"]
    resources: ["deployments","replicasets","statefulsets"]
    verbs: ["get","list","watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: mcp-namespace-view-binding
  namespace: opendatahub
subjects:
  - kind: ServiceAccount
    name: mcp-server
    namespace: opendatahub
roleRef:
  kind: Role
  name: mcp-namespace-view
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubernetes-mcp-server
  namespace: opendatahub
  labels:
    app: kubernetes-mcp-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kubernetes-mcp-server
  template:
    metadata:
      labels:
        app: kubernetes-mcp-server
    spec:
      serviceAccountName: mcp-server
      securityContext:
        runAsNonRoot: true
        # If your image has a non-root user baked in (recommended), set its UID here:
        # runAsUser: 10001
      containers:
        - name: server
          image: quay.io/redhat-ai-services/kubernetes-mcp-server
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 8080
          env:
            # Add whatever your MCP server expects; examples:
            - name: LOG_LEVEL
              value: info
            - name: PORT
              value: "8080"
            # If it needs kube in-cluster config, it will pick it up via the SA token automatically.
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: kubernetes-mcp-server
  namespace: opendatahub
  labels:
    app: kubernetes-mcp-server
spec:
  selector:
    app: kubernetes-mcp-server
  ports:
    - name: http
      port: 80
      targetPort: 8080
  type: ClusterIP
```

2 ) Apply the application to your cluster with the following command: 

```terminal 
oc apply -f kubernetes-mcp.yaml
```

#### Configuring a Service Now MCP server 

1) Create a `service-now-mcp.yaml` file with the following example parameters. Ensure you replace the placeholder values with your ServiceNow instance details.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: servicenow-credentials
  namespace: opendatahub
  labels:
    app: servicenow-mcp
type: Opaque
stringData:
  SERVICENOW_INSTANCE_URL: "https://<your-.service-now.com/"
  SERVICENOW_USERNAME: "<your-redhat-email>"
  SERVICENOW_PASSWORD: "8!pass"
  SERVICENOW_AUTH_TYPE: "basic"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: servicenow-mcp
  namespace: opendatahub
  labels:
    app: servicenow-mcp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: servicenow-mcp
  template:
    metadata:
      labels:
        app: servicenow-mcp
    spec:
      containers:
        - name: servicenow-mcp
          image: <your-servicenow-mcp-image>
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 8080
          env:
            - name: SERVICENOW_INSTANCE_URL
              valueFrom:
                secretKeyRef:
                  name: servicenow-credentials
                  key: SERVICENOW_INSTANCE_URL
            - name: SERVICENOW_USERNAME
              valueFrom:
                secretKeyRef:
                  name: servicenow-credentials
                  key: SERVICENOW_USERNAME
            - name: SERVICENOW_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: servicenow-credentials
                  key: SERVICENOW_PASSWORD
            - name: SERVICENOW_AUTH_TYPE
              valueFrom:
                secretKeyRef:
                  name: servicenow-credentials
                  key: SERVICENOW_AUTH_TYPE
---
apiVersion: v1
kind: Service
metadata:
  name: servicenow-mcp
  namespace: opendatahub
  labels:
    app: servicenow-mcp
spec:
  type: ClusterIP
  selector:
    app: servicenow-mcp
  ports:
    - name: http
      port: 8080
      targetPort: http
```

2 ) Apply the configuration with the following command 

```terminal
oc apply -f service-now-mcp.yaml
```

### Setting up your ConfigMap 

1 ) Create a `config.yaml` file that references the URL endpoints you created when configuring the MCP server. You can access the URLs in the following documentation [DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/). Ensure you populate the `url` parameter with your endpoint. 

When deploying on the ODH or OpenShift AI dashboard, you need to enter the following parameters in the Dashboard Namespace. 

*Example ConfigMap `config.yaml` file*

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: gen-ai-aa-mcp-servers
  namespace: opendatahub
immutable: false
data:
GitHub-MCP-Server: |
    {
    "url": "https://api.githubcopilot.com/mcp/x/repos/readonly", 
    "description": "The GitHub MCP server enables exploration and interaction with repositories, code, and developer resources on GitHub. It provides programmatic access to repositories, issues, pull requests, and related project data, allowing automation and integration within development workflows. With this service, developers can query repositories, discover project metadata, and streamline code-related tasks through MCP-compatible tools."
    }
Kubernetes-MCP-Server: |
    {
    "url": "http://kubernetes-mcp-server.opendatahub.svc.cluster.local/mcp",
    "description": "A powerful and flexible Kubernetes Model Context Protocol (MCP) server implementation with support for Kubernetes and OpenShift."
    }
Slack-MCP-Server: |
    {
    "url": "http://slack-mcp.opendatahub.svc.cluster.local/mcp",
    "description": "A powerful and flexible Kubernetes Model Context Protocol (MCP) server implementation with support for Slack."
    }
ServiceNow-MCP-Server: |
    {
    "url": "http://servicenow-mcp.opendatahub.svc.cluster.local/sse",
    "description": "A powerful and flexible Kubernetes Model Context Protocol (MCP) server implementation with support for ServiceNow."
    }
GSuite-MCP-Server: |
    {
    "url": "http://gsuite-mcp.opendatahub.svc.cluster.local/mcp",
    "description": "A powerful and flexible Kubernetes Model Context Protocol (MCP) server implementation with support for Google Workplace."
    }
```

2 ) Apply the application to your cluster with the following command:

  ```terminal
  oc apply -f config.yaml
  ```