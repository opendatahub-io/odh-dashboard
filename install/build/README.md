
## Config

```
kustomize cfg set . IMAGE_NAME <image-name> 
kustomize cfg set . TAG_NAME <tag-name>
kustomize cfg set . NAMESPACE_NAME <namespace-name> 
kustomize cfg list-setters .
```

## Deploy

kustomize build | kubectl apply -f -

## Undeploy

kustomize build | kubectl delete -f -
