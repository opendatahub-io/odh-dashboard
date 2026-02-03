# Issue: NIM Operator Deployments Not Getting External Routes

## ✅ What's Working:

1. **Dashboard Configuration**
   - Dashboard correctly sets `networking.kserve.io/visibility: exposed` in `NIMService.spec.labels` ✅
   - Dashboard correctly sets `networking.kserve.io/visibility: exposed` in `NIMService.metadata.labels` ✅

2. **Label Propagation**
   - Label properly propagates from `NIMService.spec.labels` to `InferenceService.metadata.labels` ✅

3. **ODH Model Controller Detection**
   - ODH Model Controller detects the `networking.kserve.io/visibility: exposed` label ✅
   - Controller finds the predictor Service ✅
   - Controller attempts Route creation (logs show "Delta found, create: route-check") ✅

4. **Service Configuration**
   - Service has all required labels ✅
     - `serving.kserve.io/inferenceservice: route-check` ✅
     - `component: predictor` ✅
     - `networking.kserve.io/visibility: exposed` ✅
   - Service has correct port configuration ✅
     - Port name: `"api"` ✅
     - Port: `80` ✅
     - TargetPort: `8000` (numeric) ✅

---

## ❌ What's Failing:

Route creation fails with **OpenShift API server** error:

```
Route.route.openshift.io "route-check" is invalid: spec.port.targetPort: Required value
```

**Full controller error log**:
```
2026-02-03T12:19:12Z DEBUG Delta found {"create": "route-check"}
2026-02-03T12:19:12Z ERROR Reconciler error
  Route.route.openshift.io "route-check" is invalid: spec.port.targetPort: Required value
```

---

## 🔍 Root Cause Analysis:

### Critical Insight
The error comes from **OpenShift's API server admission controller**, NOT from the ODH controller's own validation. This means:

1. ✅ ODH controller successfully built the Route object in memory
2. ✅ ODH controller's `checkRouteTargetPort` validation passed (or was bypassed)
3. ✅ Controller called `r.client.Create(ctx, desiredRoute)` (line 257)
4. ❌ **OpenShift rejected the Route because `spec.port.targetPort` was empty/invalid when received**

This points to a **serialization or value-corruption issue**, not a logical error in the controller code.

---

## 🎯 Suspected Issues (Priority Order):

### 1. PRIMARY SUSPECT: Serialization Bug (Most Likely)

The `intstr.IntOrString` value doesn't serialize correctly to JSON/YAML when submitted to the OpenShift API through the controller-runtime client.

**Hypothesis**:
```go
// In memory (what controller has):
targetPort = intstr.IntOrString{
    Type: 1,        // intstr.String
    StrVal: "api",
    IntVal: 0,
}

// But when marshaled to JSON for API call:
{
  "spec": {
    "port": {
      "targetPort": {}  // ← Empty or null!
    }
  }
}
```

**Why we suspect this**:
- ✅ Manual `oc apply` with `targetPort: api` works perfectly (bypasses Go serialization)
- ✅ OpenShift accepts the configuration when sent directly via YAML
- ✅ Controller logs show "Delta found" (controller attempted to create Route)
- ❌ Error is from API server (value is corrupted/missing during submission)
- ✅ Tests pass (in-memory operations work)
- ❌ Only fails when submitted through controller-runtime client

### 2. SECONDARY SUSPECT: Validation Logic (Contributing Factor)

The `checkRouteTargetPort` validation (lines 194-196) may incorrectly reject valid targetPorts:

```go
if (targetPort.Type == intstr.String && targetPort.StrVal != "") || 
   (targetPort.Type == intstr.Int && targetPort.IntVal != 0) {
    return nil
}
```

**Potential issue**: If `Type` field is somehow 0 (zero-value) even though `StrVal` is set to `"api"`, the validation would fail:
- `targetPort.Type == intstr.String` → FALSE (if Type is 0)
- Code proceeds to re-fetch Service and recalculate targetPort
- Something in this re-processing path may corrupt the value

**Evidence**: Test helper (line 365) uses more lenient OR logic:
```go
if targetPort.Type != 0 || targetPort.IntVal != 0 || targetPort.StrVal != "" {
```

### 3. TERTIARY: Controller-Runtime Client Compatibility

Possible mismatch between how controller-runtime client serializes `intstr.IntOrString` and what OpenShift Route CRD expects.

---

## ✅ Proof Service Configuration is Correct:

### Manual Route Creation Test
We manually created this Route:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: route-check
  namespace: mtalvi-operator
  labels:
    serving.kserve.io/inferenceservice: route-check
spec:
  port:
    targetPort: api  # ← Named reference to Service port
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
  to:
    kind: Service
    name: route-check-predictor
    weight: 100
  wildcardPolicy: None
```

### Results:
- ✅ **Route created successfully**: `route.route.openshift.io/route-check created`
- ✅ **Route admitted**: `status.ingress.conditions.type: Admitted = True`
- ✅ **External URL accessible**: `https://route-check-mtalvi-operator.apps.ai-dev06.kni.syseng.devcluster.openshift.com`
- ✅ **HTTP Status**: 404 (expected - endpoint exists, needs auth/proper path)

### This Proves:
- ✅ Service port name `"api"` is **valid**
- ✅ Route → Service → Container port flow **works correctly**
- ✅ OpenShift **accepts** this exact configuration
- ✅ External endpoint is **accessible**
- ✅ **The Service requires NO changes**

---

## 📊 Comparison with Legacy Deployment:

### Service Configuration

| Aspect | NIM Operator (route-check) | Legacy (no-operator) |
|--------|---------------------------|----------------------|
| Port Name | `api` | `https` |
| Port | `80` | `8443` |
| TargetPort | `8000` (numeric) | `https` (named) |
| Labels | ✅ All present | ✅ All present |

### Route Configuration

| Aspect | Manual (route-check) | Auto (no-operator) |
|--------|---------------------|-------------------|
| TargetPort | `api` (named) | `8443` (numeric) |
| TLS | `edge` | `reencrypt` |
| Status | ✅ Works | ✅ Works |
| Created By | Manual `oc apply` | ODH Controller |

**Key Finding**: Both **named** (`api`) and **numeric** (`8443`) targetPorts work when submitted directly to OpenShift. The ODH controller successfully creates Routes with numeric targetPorts (legacy) but fails with named targetPorts (NIM Operator).

---

## 🔧 Recommended Debug Steps:

### 1. Add Logging Before API Submission
Around line 254-257 (`kserve_raw_route_reconciler.go`):

```go
if delta.IsAdded() {
    log.V(1).Info("Delta found", "create", desiredRoute.GetName())
    if err = checkRouteTargetPort(ctx, r.client, desiredRoute); err != nil {
        return err
    }
    
    // ADD THIS DETAILED LOGGING:
    log.Info("About to create Route - BEFORE submission to API", 
        "name", desiredRoute.Name,
        "hasPort", desiredRoute.Spec.Port != nil,
        "targetPort-String", desiredRoute.Spec.Port.TargetPort.String(),
        "targetPort-Type", desiredRoute.Spec.Port.TargetPort.Type,
        "targetPort-StrVal", desiredRoute.Spec.Port.TargetPort.StrVal,
        "targetPort-IntVal", desiredRoute.Spec.Port.TargetPort.IntVal)
    
    if err = r.client.Create(ctx, desiredRoute); err != nil {
        // ADD THIS TOO:
        log.Error(err, "FAILED to create Route - AFTER API rejection",
            "name", desiredRoute.Name,
            "targetPort-after-failure", desiredRoute.Spec.Port.TargetPort.String())
        return err
    }
}
```

### 2. Add Logging in checkRouteTargetPort
Around lines 194-196:

```go
func (r *KServeRawInferenceServiceReconciler) checkRouteTargetPort(ctx context.Context, cli client.Client, route *routev1.Route) error {
    // Get targetPort from the route
    targetPort := route.Spec.Port.TargetPort
    
    // ADD THIS LOGGING:
    log.Info("checkRouteTargetPort - START",
        "routeName", route.Name,
        "hasPort", route.Spec.Port != nil,
        "targetPort-String", targetPort.String(),
        "targetPort-Type", targetPort.Type,
        "targetPort-TypeInt", int(targetPort.Type),
        "targetPort-StrVal", targetPort.StrVal,
        "targetPort-IntVal", targetPort.IntVal)

    // Check if targetPort is already set
    if (targetPort.Type == intstr.String && targetPort.StrVal != "") || 
       (targetPort.Type == intstr.Int && targetPort.IntVal != 0) {
        log.Info("checkRouteTargetPort - VALIDATION PASSED", "routeName", route.Name)
        return nil
    }
    
    log.Info("checkRouteTargetPort - VALIDATION FAILED, re-fetching Service", "routeName", route.Name)
    // ... rest of function
}
```

### 3. Verify intstr Initialization
Check where `targetPort` is set (around line 229):

```go
targetPort = intstr.FromString(servicePorts[0].Name)

// ADD VERIFICATION:
log.Info("Set targetPort from Service",
    "serviceName", service.Name,
    "portName", servicePorts[0].Name,
    "targetPort-Type", targetPort.Type,
    "targetPort-StrVal", targetPort.StrVal,
    "targetPort-IntVal", targetPort.IntVal)
```

---

## 🐛 Potential Quick Fixes:

### Option 1: Relax Validation Logic
Change lines 194-196 from:

```go
if (targetPort.Type == intstr.String && targetPort.StrVal != "") || 
   (targetPort.Type == intstr.Int && targetPort.IntVal != 0) {
    return nil
}
```

To:

```go
// Accept any non-empty targetPort value (match test helper logic)
if targetPort.StrVal != "" || targetPort.IntVal != 0 {
    return nil
}
```

### Option 2: Force Numeric TargetPort for NIM
If named ports consistently fail serialization, convert to numeric:

```go
// After finding the port, use the numeric port value instead of name
targetPort = intstr.FromInt(int(servicePorts[0].Port))
```

**Note**: This is a workaround, not a proper fix.

---

## 📌 Key Takeaway:

This is a **bug in the ODH Model Controller's Route creation/submission logic**, specifically in how `intstr.IntOrString` values are serialized when submitted to the OpenShift API.

- ✅ **Dashboard**: Working correctly, no changes needed
- ✅ **NIM Operator**: Working correctly, no changes needed  
- ✅ **Service**: Configuration is correct, no changes needed
- ❌ **ODH Model Controller**: Needs debugging and fix for Route submission

The manual Route creation proves the Service configuration is **100% correct**. The controller needs to properly serialize and submit the `targetPort` value.

---

## 📎 Verification Details:

**Deployment**: `route-check` (Fresh NIM Operator deployment)  
**Namespace**: `mtalvi-operator`  
**Date**: 2026-02-03  
**Full verification log**: See `ROUTE_VERIFICATION_ROUTE_CHECK.md`
