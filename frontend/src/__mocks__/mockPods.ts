// api/k8s/api/v1/namespaces/project/pods

export const mockPods =  {
    "kind": "PodList",
    "apiVersion": "v1",
    "metadata": {
        "resourceVersion": "8742577"
    },
    "items": [
        {
            "metadata": {
                "name": "workbench-0",
                "generateName": "workbench-",
                "namespace": "project",
                "uid": "6de9706e-5065-41b2-84a6-7a568404b0d1",
                "resourceVersion": "4800675",
                "creationTimestamp": "2023-02-14T22:06:45Z",
                "labels": {
                    "app": "workbench",
                    "controller-revision-hash": "workbench-5b68f78f58",
                    "notebook-name": "workbench",
                    "opendatahub.io/dashboard": "true",
                    "opendatahub.io/odh-managed": "true",
                    "opendatahub.io/user": "admin",
                    "statefulset": "workbench",
                    "statefulset.kubernetes.io/pod-name": "workbench-0"
                },
                "annotations": {
                    "k8s.v1.cni.cncf.io/network-status": "[{\n    \"name\": \"openshift-sdn\",\n    \"interface\": \"eth0\",\n    \"ips\": [\n        \"10.131.1.182\"\n    ],\n    \"default\": true,\n    \"dns\": {}\n}]",
                    "k8s.v1.cni.cncf.io/networks-status": "[{\n    \"name\": \"openshift-sdn\",\n    \"interface\": \"eth0\",\n    \"ips\": [\n        \"10.131.1.182\"\n    ],\n    \"default\": true,\n    \"dns\": {}\n}]",
                    "openshift.io/scc": "restricted-v2",
                    "seccomp.security.alpha.kubernetes.io/pod": "runtime/default"
                },
                "ownerReferences": [
                    {
                        "apiVersion": "apps/v1",
                        "kind": "StatefulSet",
                        "name": "workbench",
                        "uid": "5c0e1547-5906-46cb-8562-8d10545dc98c",
                        "controller": true,
                        "blockOwnerDeletion": true
                    }
                ],
                "managedFields": [
                    {
                        "manager": "kube-controller-manager",
                        "operation": "Update",
                        "apiVersion": "v1",
                        "time": "2023-02-14T22:06:45Z",
                        "fieldsType": "FieldsV1",
                        "fieldsV1": {
                            "f:metadata": {
                                "f:generateName": {},
                                "f:labels": {
                                    ".": {},
                                    "f:app": {},
                                    "f:controller-revision-hash": {},
                                    "f:notebook-name": {},
                                    "f:opendatahub.io/dashboard": {},
                                    "f:opendatahub.io/odh-managed": {},
                                    "f:opendatahub.io/user": {},
                                    "f:statefulset": {},
                                    "f:statefulset.kubernetes.io/pod-name": {}
                                },
                                "f:ownerReferences": {
                                    ".": {},
                                    "k:{\"uid\":\"5c0e1547-5906-46cb-8562-8d10545dc98c\"}": {}
                                }
                            },
                            "f:spec": {
                                "f:affinity": {
                                    ".": {},
                                    "f:nodeAffinity": {
                                        ".": {},
                                        "f:preferredDuringSchedulingIgnoredDuringExecution": {}
                                    }
                                },
                                "f:containers": {
                                    "k:{\"name\":\"oauth-proxy\"}": {
                                        ".": {},
                                        "f:args": {},
                                        "f:env": {
                                            ".": {},
                                            "k:{\"name\":\"NAMESPACE\"}": {
                                                ".": {},
                                                "f:name": {},
                                                "f:valueFrom": {
                                                    ".": {},
                                                    "f:fieldRef": {}
                                                }
                                            }
                                        },
                                        "f:image": {},
                                        "f:imagePullPolicy": {},
                                        "f:livenessProbe": {
                                            ".": {},
                                            "f:failureThreshold": {},
                                            "f:httpGet": {
                                                ".": {},
                                                "f:path": {},
                                                "f:port": {},
                                                "f:scheme": {}
                                            },
                                            "f:initialDelaySeconds": {},
                                            "f:periodSeconds": {},
                                            "f:successThreshold": {},
                                            "f:timeoutSeconds": {}
                                        },
                                        "f:name": {},
                                        "f:ports": {
                                            ".": {},
                                            "k:{\"containerPort\":8443,\"protocol\":\"TCP\"}": {
                                                ".": {},
                                                "f:containerPort": {},
                                                "f:name": {},
                                                "f:protocol": {}
                                            }
                                        },
                                        "f:readinessProbe": {
                                            ".": {},
                                            "f:failureThreshold": {},
                                            "f:httpGet": {
                                                ".": {},
                                                "f:path": {},
                                                "f:port": {},
                                                "f:scheme": {}
                                            },
                                            "f:initialDelaySeconds": {},
                                            "f:periodSeconds": {},
                                            "f:successThreshold": {},
                                            "f:timeoutSeconds": {}
                                        },
                                        "f:resources": {
                                            ".": {},
                                            "f:limits": {
                                                ".": {},
                                                "f:cpu": {},
                                                "f:memory": {}
                                            },
                                            "f:requests": {
                                                ".": {},
                                                "f:cpu": {},
                                                "f:memory": {}
                                            }
                                        },
                                        "f:terminationMessagePath": {},
                                        "f:terminationMessagePolicy": {},
                                        "f:volumeMounts": {
                                            ".": {},
                                            "k:{\"mountPath\":\"/etc/oauth/config\"}": {
                                                ".": {},
                                                "f:mountPath": {},
                                                "f:name": {}
                                            },
                                            "k:{\"mountPath\":\"/etc/tls/private\"}": {
                                                ".": {},
                                                "f:mountPath": {},
                                                "f:name": {}
                                            }
                                        }
                                    },
                                    "k:{\"name\":\"workbench\"}": {
                                        ".": {},
                                        "f:env": {
                                            ".": {},
                                            "k:{\"name\":\"JUPYTER_IMAGE\"}": {
                                                ".": {},
                                                "f:name": {},
                                                "f:value": {}
                                            },
                                            "k:{\"name\":\"NB_PREFIX\"}": {
                                                ".": {},
                                                "f:name": {},
                                                "f:value": {}
                                            },
                                            "k:{\"name\":\"NOTEBOOK_ARGS\"}": {
                                                ".": {},
                                                "f:name": {},
                                                "f:value": {}
                                            }
                                        },
                                        "f:envFrom": {},
                                        "f:image": {},
                                        "f:imagePullPolicy": {},
                                        "f:livenessProbe": {
                                            ".": {},
                                            "f:failureThreshold": {},
                                            "f:httpGet": {
                                                ".": {},
                                                "f:path": {},
                                                "f:port": {},
                                                "f:scheme": {}
                                            },
                                            "f:initialDelaySeconds": {},
                                            "f:periodSeconds": {},
                                            "f:successThreshold": {},
                                            "f:timeoutSeconds": {}
                                        },
                                        "f:name": {},
                                        "f:ports": {
                                            ".": {},
                                            "k:{\"containerPort\":8888,\"protocol\":\"TCP\"}": {
                                                ".": {},
                                                "f:containerPort": {},
                                                "f:name": {},
                                                "f:protocol": {}
                                            }
                                        },
                                        "f:readinessProbe": {
                                            ".": {},
                                            "f:failureThreshold": {},
                                            "f:httpGet": {
                                                ".": {},
                                                "f:path": {},
                                                "f:port": {},
                                                "f:scheme": {}
                                            },
                                            "f:initialDelaySeconds": {},
                                            "f:periodSeconds": {},
                                            "f:successThreshold": {},
                                            "f:timeoutSeconds": {}
                                        },
                                        "f:resources": {
                                            ".": {},
                                            "f:limits": {
                                                ".": {},
                                                "f:cpu": {},
                                                "f:memory": {}
                                            },
                                            "f:requests": {
                                                ".": {},
                                                "f:cpu": {},
                                                "f:memory": {}
                                            }
                                        },
                                        "f:terminationMessagePath": {},
                                        "f:terminationMessagePolicy": {},
                                        "f:volumeMounts": {
                                            ".": {},
                                            "k:{\"mountPath\":\"/opt/app-root/src\"}": {
                                                ".": {},
                                                "f:mountPath": {},
                                                "f:name": {}
                                            }
                                        },
                                        "f:workingDir": {}
                                    }
                                },
                                "f:dnsPolicy": {},
                                "f:enableServiceLinks": {},
                                "f:hostname": {},
                                "f:restartPolicy": {},
                                "f:schedulerName": {},
                                "f:securityContext": {},
                                "f:serviceAccount": {},
                                "f:serviceAccountName": {},
                                "f:terminationGracePeriodSeconds": {},
                                "f:tolerations": {},
                                "f:volumes": {
                                    ".": {},
                                    "k:{\"name\":\"oauth-config\"}": {
                                        ".": {},
                                        "f:name": {},
                                        "f:secret": {
                                            ".": {},
                                            "f:defaultMode": {},
                                            "f:secretName": {}
                                        }
                                    },
                                    "k:{\"name\":\"tls-certificates\"}": {
                                        ".": {},
                                        "f:name": {},
                                        "f:secret": {
                                            ".": {},
                                            "f:defaultMode": {},
                                            "f:secretName": {}
                                        }
                                    },
                                    "k:{\"name\":\"workbench\"}": {
                                        ".": {},
                                        "f:name": {},
                                        "f:persistentVolumeClaim": {
                                            ".": {},
                                            "f:claimName": {}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        "manager": "multus",
                        "operation": "Update",
                        "apiVersion": "v1",
                        "time": "2023-02-14T22:06:52Z",
                        "fieldsType": "FieldsV1",
                        "fieldsV1": {
                            "f:metadata": {
                                "f:annotations": {
                                    "f:k8s.v1.cni.cncf.io/network-status": {},
                                    "f:k8s.v1.cni.cncf.io/networks-status": {}
                                }
                            }
                        },
                        "subresource": "status"
                    },
                    {
                        "manager": "kubelet",
                        "operation": "Update",
                        "apiVersion": "v1",
                        "time": "2023-02-14T22:07:05Z",
                        "fieldsType": "FieldsV1",
                        "fieldsV1": {
                            "f:status": {
                                "f:conditions": {
                                    "k:{\"type\":\"ContainersReady\"}": {
                                        ".": {},
                                        "f:lastProbeTime": {},
                                        "f:lastTransitionTime": {},
                                        "f:status": {},
                                        "f:type": {}
                                    },
                                    "k:{\"type\":\"Initialized\"}": {
                                        ".": {},
                                        "f:lastProbeTime": {},
                                        "f:lastTransitionTime": {},
                                        "f:status": {},
                                        "f:type": {}
                                    },
                                    "k:{\"type\":\"Ready\"}": {
                                        ".": {},
                                        "f:lastProbeTime": {},
                                        "f:lastTransitionTime": {},
                                        "f:status": {},
                                        "f:type": {}
                                    }
                                },
                                "f:containerStatuses": {},
                                "f:hostIP": {},
                                "f:phase": {},
                                "f:podIP": {},
                                "f:podIPs": {
                                    ".": {},
                                    "k:{\"ip\":\"10.131.1.182\"}": {
                                        ".": {},
                                        "f:ip": {}
                                    }
                                },
                                "f:startTime": {}
                            }
                        },
                        "subresource": "status"
                    }
                ]
            },
            "spec": {
                "volumes": [
                    {
                        "name": "workbench",
                        "persistentVolumeClaim": {
                            "claimName": "workbench"
                        }
                    },
                    {
                        "name": "oauth-config",
                        "secret": {
                            "secretName": "workbench-oauth-config",
                            "defaultMode": 420
                        }
                    },
                    {
                        "name": "tls-certificates",
                        "secret": {
                            "secretName": "workbench-tls",
                            "defaultMode": 420
                        }
                    },
                    {
                        "name": "kube-api-access-zzc98",
                        "projected": {
                            "sources": [
                                {
                                    "serviceAccountToken": {
                                        "expirationSeconds": 3607,
                                        "path": "token"
                                    }
                                },
                                {
                                    "configMap": {
                                        "name": "kube-root-ca.crt",
                                        "items": [
                                            {
                                                "key": "ca.crt",
                                                "path": "ca.crt"
                                            }
                                        ]
                                    }
                                },
                                {
                                    "downwardAPI": {
                                        "items": [
                                            {
                                                "path": "namespace",
                                                "fieldRef": {
                                                    "apiVersion": "v1",
                                                    "fieldPath": "metadata.namespace"
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    "configMap": {
                                        "name": "openshift-service-ca.crt",
                                        "items": [
                                            {
                                                "key": "service-ca.crt",
                                                "path": "service-ca.crt"
                                            }
                                        ]
                                    }
                                }
                            ],
                            "defaultMode": 420
                        }
                    }
                ],
                "containers": [
                    {
                        "name": "workbench",
                        "image": "image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-minimal-notebook:py3.8-v1",
                        "workingDir": "/opt/app-root/src",
                        "ports": [
                            {
                                "name": "notebook-port",
                                "containerPort": 8888,
                                "protocol": "TCP"
                            }
                        ],
                        "envFrom": [
                            {
                                "secretRef": {
                                    "name": "aws-connection-db-1"
                                }
                            }
                        ],
                        "env": [
                            {
                                "name": "NOTEBOOK_ARGS",
                                "value": "--ServerApp.port=8888\n                  --ServerApp.token=''\n                  --ServerApp.password=''\n                  --ServerApp.base_url=/notebook/project/workbench\n                  --ServerApp.quit_button=False\n                  --ServerApp.tornado_settings={\"user\":\"admin\",\"hub_host\":\"http://localhost:4010\",\"hub_prefix\":\"/projects/project\"}"
                            },
                            {
                                "name": "JUPYTER_IMAGE",
                                "value": "image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-minimal-notebook:py3.8-v1"
                            },
                            {
                                "name": "NB_PREFIX",
                                "value": "/notebook/project/workbench"
                            }
                        ],
                        "resources": {
                            "limits": {
                                "cpu": "2",
                                "memory": "8Gi"
                            },
                            "requests": {
                                "cpu": "1",
                                "memory": "8Gi"
                            }
                        },
                        "volumeMounts": [
                            {
                                "name": "workbench",
                                "mountPath": "/opt/app-root/src"
                            },
                            {
                                "name": "kube-api-access-zzc98",
                                "readOnly": true,
                                "mountPath": "/var/run/secrets/kubernetes.io/serviceaccount"
                            }
                        ],
                        "livenessProbe": {
                            "httpGet": {
                                "path": "/notebook/project/workbench/api",
                                "port": "notebook-port",
                                "scheme": "HTTP"
                            },
                            "initialDelaySeconds": 10,
                            "timeoutSeconds": 1,
                            "periodSeconds": 5,
                            "successThreshold": 1,
                            "failureThreshold": 3
                        },
                        "readinessProbe": {
                            "httpGet": {
                                "path": "/notebook/project/workbench/api",
                                "port": "notebook-port",
                                "scheme": "HTTP"
                            },
                            "initialDelaySeconds": 10,
                            "timeoutSeconds": 1,
                            "periodSeconds": 5,
                            "successThreshold": 1,
                            "failureThreshold": 3
                        },
                        "terminationMessagePath": "/dev/termination-log",
                        "terminationMessagePolicy": "File",
                        "imagePullPolicy": "Always",
                        "securityContext": {
                            "capabilities": {
                                "drop": [
                                    "ALL"
                                ]
                            },
                            "runAsUser": 1000700000,
                            "runAsNonRoot": true,
                            "allowPrivilegeEscalation": false
                        }
                    },
                    {
                        "name": "oauth-proxy",
                        "image": "registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4bef31eb993feb6f1096b51b4876c65a6fb1f4401fee97fa4f4542b6b7c9bc46",
                        "args": [
                            "--provider=openshift",
                            "--https-address=:8443",
                            "--http-address=",
                            "--openshift-service-account=workbench",
                            "--cookie-secret-file=/etc/oauth/config/cookie_secret",
                            "--cookie-expire=24h0m0s",
                            "--tls-cert=/etc/tls/private/tls.crt",
                            "--tls-key=/etc/tls/private/tls.key",
                            "--upstream=http://localhost:8888",
                            "--upstream-ca=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt",
                            "--skip-auth-regex=^(?:/notebook/$(NAMESPACE)/workbench)?/api$",
                            "--email-domain=*",
                            "--skip-provider-button",
                            "--openshift-sar={\"verb\":\"get\",\"resource\":\"notebooks\",\"resourceAPIGroup\":\"kubeflow.org\",\"resourceName\":\"workbench\",\"namespace\":\"$(NAMESPACE)\"}",
                            "--logout-url=http://localhost:4010/projects/project?notebookLogout=workbench"
                        ],
                        "ports": [
                            {
                                "name": "oauth-proxy",
                                "containerPort": 8443,
                                "protocol": "TCP"
                            }
                        ],
                        "env": [
                            {
                                "name": "NAMESPACE",
                                "valueFrom": {
                                    "fieldRef": {
                                        "apiVersion": "v1",
                                        "fieldPath": "metadata.namespace"
                                    }
                                }
                            }
                        ],
                        "resources": {
                            "limits": {
                                "cpu": "100m",
                                "memory": "64Mi"
                            },
                            "requests": {
                                "cpu": "100m",
                                "memory": "64Mi"
                            }
                        },
                        "volumeMounts": [
                            {
                                "name": "oauth-config",
                                "mountPath": "/etc/oauth/config"
                            },
                            {
                                "name": "tls-certificates",
                                "mountPath": "/etc/tls/private"
                            },
                            {
                                "name": "kube-api-access-zzc98",
                                "readOnly": true,
                                "mountPath": "/var/run/secrets/kubernetes.io/serviceaccount"
                            }
                        ],
                        "livenessProbe": {
                            "httpGet": {
                                "path": "/oauth/healthz",
                                "port": "oauth-proxy",
                                "scheme": "HTTPS"
                            },
                            "initialDelaySeconds": 30,
                            "timeoutSeconds": 1,
                            "periodSeconds": 5,
                            "successThreshold": 1,
                            "failureThreshold": 3
                        },
                        "readinessProbe": {
                            "httpGet": {
                                "path": "/oauth/healthz",
                                "port": "oauth-proxy",
                                "scheme": "HTTPS"
                            },
                            "initialDelaySeconds": 5,
                            "timeoutSeconds": 1,
                            "periodSeconds": 5,
                            "successThreshold": 1,
                            "failureThreshold": 3
                        },
                        "terminationMessagePath": "/dev/termination-log",
                        "terminationMessagePolicy": "File",
                        "imagePullPolicy": "Always",
                        "securityContext": {
                            "capabilities": {
                                "drop": [
                                    "ALL"
                                ]
                            },
                            "runAsUser": 1000700000,
                            "runAsNonRoot": true,
                            "allowPrivilegeEscalation": false
                        }
                    }
                ],
                "restartPolicy": "Always",
                "terminationGracePeriodSeconds": 30,
                "dnsPolicy": "ClusterFirst",
                "serviceAccountName": "workbench",
                "serviceAccount": "workbench",
                "nodeName": "user-xz6d2-worker-0-hw2hq",
                "securityContext": {
                    "seLinuxOptions": {
                        "level": "s0:c26,c25"
                    },
                    "fsGroup": 1000700000,
                    "seccompProfile": {
                        "type": "RuntimeDefault"
                    }
                },
                "imagePullSecrets": [
                    {
                        "name": "workbench-dockercfg-dn9g4"
                    }
                ],
                "hostname": "workbench-0",
                "affinity": {
                    "nodeAffinity": {
                        "preferredDuringSchedulingIgnoredDuringExecution": [
                            {
                                "weight": 1,
                                "preference": {
                                    "matchExpressions": [
                                        {
                                            "key": "nvidia.com/gpu.present",
                                            "operator": "NotIn",
                                            "values": [
                                                "true"
                                            ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                },
                "schedulerName": "default-scheduler",
                "tolerations": [
                    {
                        "key": "NotebooksOnlyChange",
                        "operator": "Exists",
                        "effect": "NoSchedule"
                    },
                    {
                        "key": "node.kubernetes.io/not-ready",
                        "operator": "Exists",
                        "effect": "NoExecute",
                        "tolerationSeconds": 300
                    },
                    {
                        "key": "node.kubernetes.io/unreachable",
                        "operator": "Exists",
                        "effect": "NoExecute",
                        "tolerationSeconds": 300
                    },
                    {
                        "key": "node.kubernetes.io/memory-pressure",
                        "operator": "Exists",
                        "effect": "NoSchedule"
                    }
                ],
                "priority": 0,
                "enableServiceLinks": false,
                "preemptionPolicy": "PreemptLowerPriority"
            },
            "status": {
                "phase": "Running",
                "conditions": [
                    {
                        "type": "Initialized",
                        "status": "True",
                        "lastProbeTime": null,
                        "lastTransitionTime": "2023-02-14T22:06:45Z"
                    },
                    {
                        "type": "Ready",
                        "status": "True",
                        "lastProbeTime": null,
                        "lastTransitionTime": "2023-02-14T22:07:05Z"
                    },
                    {
                        "type": "ContainersReady",
                        "status": "True",
                        "lastProbeTime": null,
                        "lastTransitionTime": "2023-02-14T22:07:05Z"
                    },
                    {
                        "type": "PodScheduled",
                        "status": "True",
                        "lastProbeTime": null,
                        "lastTransitionTime": "2023-02-14T22:06:45Z"
                    }
                ],
                "hostIP": "192.168.0.217",
                "podIP": "10.131.1.182",
                "podIPs": [
                    {
                        "ip": "10.131.1.182"
                    }
                ],
                "startTime": "2023-02-14T22:06:45Z",
                "containerStatuses": [
                    {
                        "name": "oauth-proxy",
                        "state": {
                            "running": {
                                "startedAt": "2023-02-14T22:06:53Z"
                            }
                        },
                        "lastState": {},
                        "ready": true,
                        "restartCount": 0,
                        "image": "registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4bef31eb993feb6f1096b51b4876c65a6fb1f4401fee97fa4f4542b6b7c9bc46",
                        "imageID": "registry.redhat.io/openshift4/ose-oauth-proxy@sha256:4bef31eb993feb6f1096b51b4876c65a6fb1f4401fee97fa4f4542b6b7c9bc46",
                        "containerID": "cri-o://301e55a5d64e84198a8853a5b73728ed573fb71c8c21b919c54211c76e4553c3",
                        "started": true
                    },
                    {
                        "name": "workbench",
                        "state": {
                            "running": {
                                "startedAt": "2023-02-14T22:06:52Z"
                            }
                        },
                        "lastState": {},
                        "ready": true,
                        "restartCount": 0,
                        "image": "image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-minimal-notebook:py3.8-v1",
                        "imageID": "image-registry.openshift-image-registry.svc:5000/redhat-ods-applications/s2i-minimal-notebook@sha256:a5a7738b09a204804e084a45f96360b568b0b9d85709c0ce6742d440ff917183",
                        "containerID": "cri-o://1ffcc8a0f9da842efcc209cdf62b7a3143dcffe21344facd0433fb46a39ff659",
                        "started": true
                    }
                ],
                "qosClass": "Burstable"
            }
        }
    ]
}