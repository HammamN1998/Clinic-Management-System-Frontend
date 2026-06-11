# Onboarding checklist & product analytics

This document summarizes the **onboarding checklist** and **Firebase Analytics** work added to ClinicWell (Clinic Management System Frontend). Use it as a reference for GitHub, onboarding new developers, or planning outreach from funnel data.

**Firebase project:** `clinic-management-system-12-23`  
**GA4 measurement ID:** `G-4ZTE50TCLY`

---

## Summary of what changed

| Area | Change |
|------|--------|
| Dashboard checklist | 3-step “Get started” card (profile, patient, appointment) |
| Removed | “Generate a document” step and PDF analytics events |
| Profile step | Links to doctor profile **Settings** tab (`?tab=settings`) |
| Doctor profile | Setup hints for phone + logo; name min-length rule removed |
| Dismiss UX | **Remind me later** (7 days) and **Don't show again** |
| Progress detection | Patients via `subscription.patientsCount`; appointments via Firestore |
| Analytics | Full activation funnel + `setUserId` + billing portal / checkout events |
| Docs | Event tables in root `README.md`; details in this file |

---

## 1. Onboarding checklist

### Purpose

Nudge new clinics through three setup milestones on the **main dashboard**. Hidden when complete, snoozed, or permanently dismissed.

### Steps (3)

| # | Step | Complete when | Start link |
|---|------|---------------|------------|
| 1 | Complete your profile | Phone number **and** brand logo saved | `/admin/doctors/doctor-profile?tab=settings` |
| 2 | Add your first patient | At least one patient exists | `/admin/patients/add-patient` |
| 3 | Schedule an appointment | At least one appointment exists | `/admin/patients/all-patients` |

The **Generate a document** step was removed (previously step 4).

### How completion is detected

| Milestone | Source | Firestore read on each check? |
|-----------|--------|-------------------------------|
| Profile | In-memory doctor: `phoneNumber` + `logo` both non-empty | No |
| Patient | localStorage flag **or** `subscription.patientsCount > 0` | No |
| Appointment | localStorage flag **or** Firestore `appointments` query (`doctorId`, `limit(1)`) | Yes (if flag not set) |

`patientsCount` is synced on the doctor session from `doctorSubscriptions` and updated in `PatientService` on add/delete.

### Dismiss behavior (localStorage only)

| Action | Storage key | Effect |
|--------|-------------|--------|
| **Remind me later** | `cw_onboarding_remind_until_{doctorId}` (timestamp) | Hidden **7 days**, then shown again if incomplete |
| **Don't show again** | `cw_onboarding_hidden_permanent_{doctorId}` | Hidden permanently on this browser |
| Legacy | `cw_onboarding_dismissed_{doctorId}` | Treated as permanent hide |

Completing all 3 steps also hides the checklist (no dismiss needed).

### Key files

- `src/app/shared/components/onboarding-checklist/` — UI
- `src/app/core/service/onboarding.service.ts` — status, flags, analytics hooks
- `src/app/admin/dashboard/main/main.component.html` — hosts `<app-onboarding-checklist>`

---

## 2. Doctor profile (Settings tab)

### Deep link from checklist

`DoctorProfileComponent` reads `?tab=settings` and opens the **Settings** tab (phone, address, brand logo).

### Setup encouragement UI

While profile is incomplete, the Settings tab shows:

- Banner callout (`DOCTORS.PROFILE.SETUP_CALLOUT`)
- `mat-hint` on phone field when phone is missing
- “Setup step” chip + hint on brand logo section when logo is missing

Hints disappear when phone and logo are both set.

### Validation

- Doctor **name** is required only (6-character minimum removed).
- Phone still has `Validators.minLength(9)` on the form.

### Analytics hook

After saving settings or uploading a logo, `recordProfileIfComplete()` runs if both phone and logo are present → fires `profile_completed` (once per doctor).

---

## 3. Product analytics

### Architecture

```
UI / services  →  AnalyticsService  →  AngularFireAnalytics  →  Firebase / GA4
OnboardingService ──┘
FirebaseAuthenticationService (signup, setUserId, email_verified)
PatientService → OnboardingService → patient / appointment events
DoctorPlansComponent / HeaderComponent → checkout / billing portal
```

### Doctor identity (`setUserId`)

- **Set:** on signup and when auth session restores (`traceAuthenticationStatus`)
- **Cleared:** on logout
- Uses Firebase Auth **UID** (`doctor.id`) — no email or name in analytics payloads

All events after login can be tied to that user in GA4 / BigQuery.

### Activation funnel

```
signup_complete
  → email_verified
  → profile_completed
  → first_patient_added
  → first_appointment_created
  → onboarding_completed
  → checkout_started
```

| Event | Parameters | Once per doctor? | Trigger |
|-------|------------|------------------|---------|
| `signup_complete` | — | No | `FirebaseAuthenticationService.signup()` |
| `email_verified` | — | Yes | Verified email on auth session load |
| `profile_completed` | — | Yes | Phone + logo saved (`recordProfileIfComplete`) |
| `patient_added` | `first` | No | Any patient added |
| `first_patient_added` | — | Yes* | First patient (`patientsCount === 0` before add) |
| `appointment_created` | `first` | No | Any appointment saved |
| `first_appointment_created` | — | Yes* | First appointment |
| `onboarding_completed` | — | Yes | All 3 checklist steps done |
| `checkout_started` | `price_id` | No | Stripe checkout redirect (`DoctorPlansComponent.pay`) |

\*First patient/appointment also use onboarding localStorage flags (`cw_onboarding_patient_*`, `cw_onboarding_appointment_*`).

### Checklist UX events

| Event | When |
|-------|------|
| `onboarding_remind_later` | Remind me later clicked |
| `onboarding_dismiss_permanent` | Don't show again clicked |

### Monetization events

| Event | Parameters | When |
|-------|------------|------|
| `billing_portal_opened` | `source`: `doctor_plans` \| `header` | Billing portal URL returned successfully |

- **Doctor plans page:** `DoctorPlansComponent.openBillingPortal()` → `source: doctor_plans`
- **Header** (inactive plan notice): `HeaderComponent.openBillingPortal()` → `source: header`

### Removed analytics

- `pdf_generated` / `first_pdf_generated` — removed from `PdfService` and `AnalyticsService`
- `subscription_started` renamed to **`checkout_started`**

### Deduplication

Once-per-doctor events use localStorage: `cw_analytics_{suffix}_{doctorId}`  
Examples: `email_verified`, `profile_completed`, `onboarding_completed`.

### Privacy

- No patient or doctor PII in event parameters
- Only booleans, `price_id`, and `source` where noted
- Analytics calls wrapped in try/catch — never block clinical workflows

---

## 4. What was intentionally not built (yet)

| Item | Why |
|------|-----|
| `subscription_activated` | Needs Stripe webhook / backend — `checkout_started` ≠ paid |
| Firestore for every patient check | Replaced with `patientsCount` for performance |
| PDF funnel step | Product decision to drop from onboarding |
| CRM / outreach lists in app | Use Firestore + Auth + Stripe for “who to contact”; GA4 for aggregate funnels |
| BigQuery | Optional next step for per-UID SQL |

---

## 5. Viewing events in Firebase / GA4

### Development (real-time)

1. [Firebase Console](https://console.firebase.google.com/) → **Analytics** → **DebugView**
2. Enable debug mode (GA Debugger extension or `debug_mode: true`)
3. Perform actions in the app; events appear within seconds

### Production

- GA4 → **Reports** → **Engagement** → **Events**
- GA4 → **Realtime** for near-live counts
- Standard reports may lag **24–48 hours**

Search for custom events: `signup_complete`, `email_verified`, `profile_completed`, `first_patient_added`, `onboarding_completed`, `checkout_started`, `billing_portal_opened`, etc.

---

## 6. Using data for decisions

| Question | Use analytics for | Use operational data for |
|----------|-------------------|-------------------------|
| Where do clinics drop off? | GA4 funnel / explorations | — |
| Which doctor to email? | Per-UID path in GA4/BigQuery | Firestore, Auth, Stripe |
| Checkout but no payment | Count of `checkout_started` | `doctorSubscriptions.status` |
| Signed up, no verify | Rate of `email_verified` | Auth `emailVerified` |
| No patients after 7 days | `first_patient_added` cohorts | `patientsCount`, patients collection |

---

## 7. File index

| File | Purpose |
|------|---------|
| `src/app/core/service/analytics.service.ts` | All analytics methods + `setUserId` |
| `src/app/core/service/onboarding.service.ts` | Checklist status, dismiss, milestone → analytics |
| `src/app/authentication/services/firebase-authentication.service.ts` | Signup, session, `setUserId`, `email_verified` |
| `src/app/shared/components/onboarding-checklist/` | Dashboard checklist UI |
| `src/app/admin/doctors/doctor-profile/` | Settings tab, setup hints, `recordProfileIfComplete` |
| `src/app/admin/doctors/doctor-plans/` | Checkout + billing portal analytics |
| `src/app/layout/header/header.component.ts` | Billing portal from header |
| `src/app/core/service/patient.service.ts` | `recordPatientAdded`, `recordAppointmentCreated` |
| `README.md` | Compact event reference tables |
| `src/assets/i18n/en.json`, `ar.json` | Onboarding + setup copy |

---

## 8. Adding a new event

1. Add a method to `AnalyticsService` (keep payloads PII-free).
2. Call it from the relevant service/component on success only.
3. Update `README.md` and this document.
4. Test in Firebase **DebugView** before relying on GA4 reports.
