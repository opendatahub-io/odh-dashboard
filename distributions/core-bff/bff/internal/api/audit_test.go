package api

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSecureAdminRoute_EmitsAuditLog(t *testing.T) {
	ch := &captureHandler{}
	logger := slog.New(ch)

	app := newTestApp(func(a *App) {
		a.logger = logger
		a.config.Namespace = "test-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	handler := app.secureAdminRoute(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	handler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	rec := ch.findAuditRecord()
	require.NotNil(t, rec, "expected audit log record")
	assert.Equal(t, "PATCH", auditAttr(rec, "action"))
	assert.Equal(t, "/api/config", auditAttr(rec, "endpoint"))
	assert.True(t, auditAttrBool(rec, "needsAdmin"))
	assert.True(t, auditAttrBool(rec, "isAdmin"))
	assert.Equal(t, "test-ns", auditAttr(rec, "namespace"))
}

func TestSecureRoute_EmitsAuditLogOnMissingIdentity(t *testing.T) {
	ch := &captureHandler{}
	logger := slog.New(ch)

	app := newTestApp(func(a *App) {
		a.logger = logger
		a.config.Namespace = "test-ns"
	})

	handler := app.secureRoute(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)

	handler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)

	rec := ch.findAuditRecord()
	require.NotNil(t, rec, "expected audit log on missing identity")
	assert.Equal(t, "unknown", auditAttr(rec, "user"))
	assert.Equal(t, "/api/config", auditAttr(rec, "endpoint"))
	assert.Equal(t, "test-ns", auditAttr(rec, "namespace"))
}

func TestSecureRoute_EmitsAuditLogOnGetClientFailure(t *testing.T) {
	ch := &captureHandler{}
	logger := slog.New(ch)

	app := newTestApp(func(a *App) {
		a.logger = logger
		a.config.Namespace = "test-ns"
	})

	handler := app.secureRoute(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "someone",
		Token:  k8s.NewBearerToken("INVALID_GARBAGE_TOKEN"),
	})

	handler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)

	rec := ch.findAuditRecord()
	require.NotNil(t, rec, "expected audit log on GetClient failure")
	assert.Equal(t, "someone", auditAttr(rec, "user"))
	assert.Equal(t, "test-ns", auditAttr(rec, "namespace"))
}

func TestSecureRoute_EmitsAuditLog(t *testing.T) {
	ch := &captureHandler{}
	logger := slog.New(ch)

	app := newTestApp(func(a *App) {
		a.logger = logger
		a.config.Namespace = "test-ns"
	})
	admin := k8mocks.DefaultTestUsers[0]

	handler := app.secureRoute(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	handler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)

	rec := ch.findAuditRecord()
	require.NotNil(t, rec, "expected audit log record")
	assert.Equal(t, "GET", auditAttr(rec, "action"))
	assert.Equal(t, "/api/config", auditAttr(rec, "endpoint"))
	assert.False(t, auditAttrBool(rec, "needsAdmin"))
	assert.Equal(t, "test-ns", auditAttr(rec, "namespace"))
}

func TestSecureAdminRoute_EmitsAuditLogOnMissingIdentity(t *testing.T) {
	ch := &captureHandler{}
	logger := slog.New(ch)

	app := newTestApp(func(a *App) {
		a.logger = logger
		a.config.Namespace = "test-ns"
	})

	handler := app.secureAdminRoute(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/config", nil)

	handler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)

	rec := ch.findAuditRecord()
	require.NotNil(t, rec, "expected audit log on missing identity")
	assert.Equal(t, "unknown", auditAttr(rec, "user"))
	assert.True(t, auditAttrBool(rec, "needsAdmin"))
	assert.False(t, auditAttrBool(rec, "isAdmin"))
	assert.Equal(t, "test-ns", auditAttr(rec, "namespace"))
}

func TestSecureAdminRoute_EmitsAuditLogOnNonAdminDenial(t *testing.T) {
	ch := &captureHandler{}
	logger := slog.New(ch)

	app := newTestApp(func(a *App) {
		a.logger = logger
		a.config.Namespace = "test-ns"
	})
	userA := k8mocks.DefaultTestUsers[1]

	handler := app.secureAdminRoute(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: userA.UserName,
		Groups: userA.Groups,
		Token:  k8s.NewBearerToken(userA.Token),
	})

	handler(rr, req, nil)

	assert.Equal(t, http.StatusForbidden, rr.Code)

	rec := ch.findAuditRecord()
	require.NotNil(t, rec, "expected audit log on non-admin denial")
	assert.Equal(t, "PATCH", auditAttr(rec, "action"))
	assert.True(t, auditAttrBool(rec, "needsAdmin"))
	assert.False(t, auditAttrBool(rec, "isAdmin"))
	assert.Equal(t, "test-ns", auditAttr(rec, "namespace"))
}

func TestSecureAdminRoute_EmitsAuditLogOnAdminCheckError(t *testing.T) {
	ch := &captureHandler{}
	logger := slog.New(ch)

	app := newTestApp(func(a *App) {
		a.logger = logger
		a.config.Namespace = "test-ns"
		a.kubernetesClientFactory = &failingAdminCheckFactory{username: "test-user"}
	})

	handler := app.secureAdminRoute(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "test-user",
		Token:  k8s.NewBearerToken("some-token"),
	})

	handler(rr, req, nil)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)

	rec := ch.findAuditRecord()
	require.NotNil(t, rec, "expected audit log on admin check error")
	assert.Equal(t, "test-user", auditAttr(rec, "user"))
	assert.True(t, auditAttrBool(rec, "needsAdmin"))
	assert.False(t, auditAttrBool(rec, "isAdmin"))
	assert.NotEmpty(t, auditAttr(rec, "adminCheckError"))
	assert.Equal(t, "test-ns", auditAttr(rec, "namespace"))
}

func TestSecureAdminRoute_EmitsAuditLogOnGetClientFailure(t *testing.T) {
	ch := &captureHandler{}
	logger := slog.New(ch)

	app := newTestApp(func(a *App) {
		a.logger = logger
		a.config.Namespace = "test-ns"
	})

	handler := app.secureAdminRoute(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "someone",
		Token:  k8s.NewBearerToken("INVALID_GARBAGE_TOKEN"),
	})

	handler(rr, req, nil)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)

	rec := ch.findAuditRecord()
	require.NotNil(t, rec, "expected audit log on GetClient failure")
	assert.Equal(t, "someone", auditAttr(rec, "user"))
	assert.True(t, auditAttrBool(rec, "needsAdmin"))
	assert.Equal(t, "test-ns", auditAttr(rec, "namespace"))
}
