package kubernetes

import (
	"fmt"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/intstr"
)

const (
	labelInject      = "kagenti.io/inject"
	labelFramework   = "kagenti.io/framework"
	labelManagedBy   = "app.kubernetes.io/managed-by"
	labelAppName     = "app.kubernetes.io/name"
	managedByValue   = "odh-dashboard"
	defaultPort      int32 = 8000
	defaultSvcPort   int32 = 8080
	injectEnabled    = "enabled"
)

func buildServiceAccount(name, namespace string) *corev1.ServiceAccount {
	return &corev1.ServiceAccount{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "ServiceAccount",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels: map[string]string{
				labelManagedBy: managedByValue,
				labelAppName:   name,
			},
		},
	}
}

func buildDeployment(params *agents.DeployAgentParams) *appsv1.Deployment {
	labels := buildDeploymentLabels(params)

	image := params.ContainerImage
	if params.ImageTag != "" {
		image = fmt.Sprintf("%s:%s", image, params.ImageTag)
	}

	containerPort := defaultPort
	if len(params.ServicePorts) > 0 && params.ServicePorts[0].TargetPort > 0 {
		containerPort = params.ServicePorts[0].TargetPort
	}

	container := corev1.Container{
		Name:  params.Name,
		Image: image,
		Ports: []corev1.ContainerPort{
			{
				ContainerPort: containerPort,
				Protocol:      corev1.ProtocolTCP,
			},
		},
		Env: buildEnvVars(params.EnvVars),
		SecurityContext: &corev1.SecurityContext{
			RunAsNonRoot:             boolPtr(true),
			AllowPrivilegeEscalation: boolPtr(false),
			Capabilities: &corev1.Capabilities{
				Drop: []corev1.Capability{"ALL"},
			},
		},
	}

	var imagePullSecrets []corev1.LocalObjectReference
	if params.ImagePullSecret != "" {
		imagePullSecrets = []corev1.LocalObjectReference{
			{Name: params.ImagePullSecret},
		}
	}

	replicas := int32(1)

	return &appsv1.Deployment{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "apps/v1",
			Kind:       "Deployment",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      params.Name,
			Namespace: params.Namespace,
			Labels:    labels,
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					labelAppName: params.Name,
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: labels,
				},
				Spec: corev1.PodSpec{
					ServiceAccountName: params.Name,
					Containers:         []corev1.Container{container},
					ImagePullSecrets:   imagePullSecrets,
					SecurityContext: &corev1.PodSecurityContext{
						RunAsNonRoot: boolPtr(true),
					},
				},
			},
		},
	}
}

func buildService(params *agents.DeployAgentParams) *corev1.Service {
	ports := buildServicePorts(params)
	return &corev1.Service{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Service",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      params.Name,
			Namespace: params.Namespace,
			Labels: map[string]string{
				labelManagedBy: managedByValue,
				labelAppName:   params.Name,
			},
		},
		Spec: corev1.ServiceSpec{
			Type: corev1.ServiceTypeClusterIP,
			Selector: map[string]string{
				labelAppName: params.Name,
			},
			Ports: ports,
		},
	}
}

func buildAgentRuntimeCR(params *agents.DeployAgentParams) *unstructured.Unstructured {
	spec := map[string]any{
		"type": "agent",
		"targetRef": map[string]any{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"name":       params.Name,
		},
	}

	if params.AuthBridgeMode != "" {
		spec["authBridgeMode"] = params.AuthBridgeMode
	}
	if params.MTLSMode != "" {
		spec["mtlsMode"] = params.MTLSMode
	}

	labels := map[string]any{
		labelManagedBy: managedByValue,
		labelAppName:   params.Name,
	}

	obj := &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": agentRuntimeGVR.Group + "/" + agentRuntimeGVR.Version,
			"kind":       "AgentRuntime",
			"metadata": map[string]any{
				"name":      params.Name,
				"namespace": params.Namespace,
				"labels":    labels,
			},
			"spec": spec,
		},
	}
	return obj
}

func buildRoute(name, namespace string, port int32) *unstructured.Unstructured {
	return &unstructured.Unstructured{
		Object: map[string]any{
			"apiVersion": openshiftRouteGVR.Group + "/" + openshiftRouteGVR.Version,
			"kind":       "Route",
			"metadata": map[string]any{
				"name":      name,
				"namespace": namespace,
				"labels": map[string]any{
					labelManagedBy: managedByValue,
					labelAppName:   name,
				},
			},
			"spec": map[string]any{
				"to": map[string]any{
					"kind": "Service",
					"name": name,
				},
				"port": map[string]any{
					"targetPort": fmt.Sprintf("%d", port),
				},
				"tls": map[string]any{
					"termination":                   "edge",
					"insecureEdgeTerminationPolicy": "Redirect",
				},
			},
		},
	}
}

func buildDeploymentLabels(params *agents.DeployAgentParams) map[string]string {
	labels := map[string]string{
		agents.LabelAgentType:    agents.AgentTypeAgent,
		agents.LabelWorkloadType: agents.WorkloadTypeDeployment,
		labelAppName:             params.Name,
		labelManagedBy:           managedByValue,
	}

	if params.AuthBridgeEnabled {
		labels[labelInject] = injectEnabled
	}

	if params.Protocol != "" {
		labels[agents.LabelProtocolPrefix+params.Protocol] = ""
	}

	if params.Framework != "" {
		labels[labelFramework] = params.Framework
	}

	return labels
}

func buildEnvVars(envVars []agents.AgentEnvVar) []corev1.EnvVar {
	if len(envVars) == 0 {
		return nil
	}
	result := make([]corev1.EnvVar, 0, len(envVars))
	for _, ev := range envVars {
		result = append(result, corev1.EnvVar{
			Name:  ev.Name,
			Value: ev.Value,
		})
	}
	return result
}

func buildServicePorts(params *agents.DeployAgentParams) []corev1.ServicePort {
	if len(params.ServicePorts) > 0 {
		ports := make([]corev1.ServicePort, 0, len(params.ServicePorts))
		for _, sp := range params.ServicePorts {
			protocol := corev1.ProtocolTCP
			if sp.Protocol != "" {
				protocol = corev1.Protocol(sp.Protocol)
			}
			ports = append(ports, corev1.ServicePort{
				Name:       sp.Name,
				Port:       sp.Port,
				TargetPort: intstr.FromInt32(sp.TargetPort),
				Protocol:   protocol,
			})
		}
		return ports
	}

	return []corev1.ServicePort{
		{
			Name:       "http",
			Port:       defaultSvcPort,
			TargetPort: intstr.FromInt32(defaultPort),
			Protocol:   corev1.ProtocolTCP,
		},
	}
}

func boolPtr(b bool) *bool {
	return &b
}
