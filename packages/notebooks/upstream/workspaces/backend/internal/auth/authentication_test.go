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

package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	authenticationv1 "k8s.io/api/authentication/v1"
	"k8s.io/apimachinery/pkg/runtime"
	k8sfake "k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

func TestAuth(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Auth Suite")
}

const (
	testAuthHeader = "Authorization"
	testAuthPrefix = "Bearer "
)

var _ = Describe("NewBearerTokenAuthenticator", func() {

	// newTokenReviews returns a fake TokenReviewInterface whose Create call always
	// responds with the given status, regardless of the request token.
	newTokenReviews := func(status authenticationv1.TokenReviewStatus) *k8sfake.Clientset {
		clientset := k8sfake.NewSimpleClientset()
		clientset.PrependReactor("create", "tokenreviews", func(action k8stesting.Action) (bool, runtime.Object, error) {
			review := action.(k8stesting.CreateAction).GetObject().(*authenticationv1.TokenReview)
			review.Status = status
			return true, review, nil
		})
		return clientset
	}

	It("propagates UID and Extra (e.g. OpenShift OAuth token scopes) from the TokenReview", func() {
		clientset := newTokenReviews(authenticationv1.TokenReviewStatus{
			Authenticated: true,
			User: authenticationv1.UserInfo{
				Username: "alice",
				UID:      "abc-123",
				Groups:   []string{"developers"},
				Extra: map[string]authenticationv1.ExtraValue{
					"scopes.authorization.openshift.io": {"user:info", "namespace:read"},
				},
			},
		})

		requestAuthenticator, err := NewBearerTokenAuthenticator(clientset.AuthenticationV1().TokenReviews(), testAuthHeader, testAuthPrefix)
		Expect(err).NotTo(HaveOccurred())

		req := httptest.NewRequest("GET", "/", http.NoBody)
		req.Header.Set(testAuthHeader, testAuthPrefix+"some-token")

		resp, ok, err := requestAuthenticator.AuthenticateRequest(req)
		Expect(err).NotTo(HaveOccurred())
		Expect(ok).To(BeTrue())
		Expect(resp.User.GetName()).To(Equal("alice"))
		Expect(resp.User.GetUID()).To(Equal("abc-123"))
		Expect(resp.User.GetGroups()).To(ConsistOf("developers", "system:authenticated"))
		Expect(resp.User.GetExtra()).To(Equal(map[string][]string{
			"scopes.authorization.openshift.io": {"user:info", "namespace:read"},
		}))
	})

	It("does not authenticate the request when the TokenReview reports it as unauthenticated", func() {
		clientset := newTokenReviews(authenticationv1.TokenReviewStatus{
			Authenticated: false,
		})

		requestAuthenticator, err := NewBearerTokenAuthenticator(clientset.AuthenticationV1().TokenReviews(), testAuthHeader, testAuthPrefix)
		Expect(err).NotTo(HaveOccurred())

		req := httptest.NewRequest("GET", "/", http.NoBody)
		req.Header.Set(testAuthHeader, testAuthPrefix+"some-token")

		resp, ok, err := requestAuthenticator.AuthenticateRequest(req)
		Expect(err).NotTo(HaveOccurred())
		Expect(ok).To(BeFalse())
		Expect(resp).To(BeNil())
	})

	It("does not authenticate the request when the header is absent", func() {
		clientset := newTokenReviews(authenticationv1.TokenReviewStatus{Authenticated: true})

		requestAuthenticator, err := NewBearerTokenAuthenticator(clientset.AuthenticationV1().TokenReviews(), testAuthHeader, testAuthPrefix)
		Expect(err).NotTo(HaveOccurred())

		req := httptest.NewRequest("GET", "/", http.NoBody)

		resp, ok, err := requestAuthenticator.AuthenticateRequest(req)
		Expect(err).NotTo(HaveOccurred())
		Expect(ok).To(BeFalse())
		Expect(resp).To(BeNil())
	})

	It("rejects the request when the header has multiple values", func() {
		clientset := newTokenReviews(authenticationv1.TokenReviewStatus{Authenticated: true})

		requestAuthenticator, err := NewBearerTokenAuthenticator(clientset.AuthenticationV1().TokenReviews(), testAuthHeader, testAuthPrefix)
		Expect(err).NotTo(HaveOccurred())

		req := httptest.NewRequest("GET", "/", http.NoBody)
		req.Header.Add(testAuthHeader, testAuthPrefix+"token-a")
		req.Header.Add(testAuthHeader, testAuthPrefix+"token-b")

		resp, ok, err := requestAuthenticator.AuthenticateRequest(req)
		Expect(err).To(HaveOccurred())
		Expect(ok).To(BeFalse())
		Expect(resp).To(BeNil())
	})
})
