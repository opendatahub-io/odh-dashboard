/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package tls

import (
	"context"
	"reflect"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const apiServerName = "cluster"

var apiServerGVK = schema.GroupVersionKind{
	Group: "config.openshift.io", Version: "v1", Kind: "APIServer",
}

// ProfileWatcher watches the APIServer CR and triggers a callback when the
// TLS security profile changes. Uses unstructured client to avoid importing
// openshift/api.
type ProfileWatcher struct {
	client.Client
	InitialProfile  map[string]interface{}
	OnProfileChange func(ctx context.Context)
	lastProfile     map[string]interface{}
}

func (w *ProfileWatcher) Reconcile(
	ctx context.Context, req reconcile.Request,
) (reconcile.Result, error) {
	if req.Name != apiServerName {
		return reconcile.Result{}, nil
	}

	apiServer := &unstructured.Unstructured{}
	apiServer.SetGroupVersionKind(apiServerGVK)
	if err := w.Get(ctx, req.NamespacedName, apiServer); err != nil {
		return reconcile.Result{}, client.IgnoreNotFound(err)
	}

	current, _, _ := unstructured.NestedMap(
		apiServer.Object, "spec", "tlsSecurityProfile",
	)
	current = normalizeProfileMap(current)
	if w.OnProfileChange != nil &&
		!reflect.DeepEqual(w.lastProfile, current) {
		w.lastProfile = current
		w.OnProfileChange(ctx)
	}

	return reconcile.Result{}, nil
}

func (w *ProfileWatcher) SetupWithManager(mgr ctrl.Manager) error {
	w.lastProfile = w.InitialProfile

	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(apiServerGVK)

	return ctrl.NewControllerManagedBy(mgr).
		Named("tls-profile-watcher").
		WithOptions(controller.Options{
			NeedLeaderElection: boolPtr(false),
		}).
		For(obj, builder.WithPredicates(predicate.Funcs{
			CreateFunc: func(e event.CreateEvent) bool {
				return e.Object.GetName() == apiServerName
			},
			UpdateFunc: func(e event.UpdateEvent) bool {
				return e.ObjectNew.GetName() == apiServerName
			},
			DeleteFunc: func(e event.DeleteEvent) bool {
				return e.Object.GetName() == apiServerName
			},
			GenericFunc: func(e event.GenericEvent) bool {
				return e.Object.GetName() == apiServerName
			},
		})).
		Complete(w)
}

func normalizeProfileMap(m map[string]interface{}) map[string]interface{} {
	if m == nil {
		return map[string]interface{}{"type": "Intermediate"}
	}
	return m
}

func boolPtr(b bool) *bool {
	return &b
}
