# Clinic-Management-System-Frontend
 This repo to save frontend code for Clinic-Management-System project.

# To initialize firebase project
- `firebase init`
- Are you ready to proceed? `Y`
- Which Firebase features do you want to set up for this directory? `Hosting: Configure files for Firebase Hosting and (optionally) set up GitHub Action deploys`
- Please select an option: `Use an existing project`
- Select a default Firebase project for this directory: `clinic-management-system-12-23 (Clinic Management System)`
- What do you want to use as your public directory? `dist/Clinic-Management-System-Frontend`
- Configure as a single-page app (rewrite all urls to /index.html)? `Y`
- Set up automatic builds and deploys with GitHub? `Y`
- For which GitHub repository would you like to set up a GitHub workflow? `HammamN1998/Clinic-Management-System-Frontend`
- Set up the workflow to run a build script before every deploy? `Y`
- What script should be run before every deploy? `npm run build`
- Set up automatic deployment to your site's live channel when a PR is merged? `Y`
- What is the name of the GitHub branch associated with your site's live channel? `main`

# To deploy project to firebase
`firebase deploy`

# To build angular app
`npm run build`

# To start angular in local
`npm start`

# To create a service. SERVICE-PATH root is src/app
`ng g service SERVICE-PATH` 

# Storage CORS (required for branded PDF logos)
Branded PDFs embed the doctor's uploaded logo. `PdfService` fetches the logo bytes
from Firebase Storage via `HttpClient` (XHR) to base64-encode them for pdfmake, so
the Storage bucket must allow cross-origin reads from the app origins. Without this,
the browser blocks the request with a CORS error and the PDF is generated without a logo.

Allowed origins are defined in `cors.json` (repo root). Apply them once per bucket
(re-run whenever origins change). The bucket is `europe-west1-storage-1`.

Using Google Cloud SDK (`gcloud`/`gsutil`) — run from the repo root:
- `gcloud storage buckets update gs://europe-west1-storage-1 --cors-file=cors.json`
- or `gsutil cors set cors.json gs://europe-west1-storage-1`

No SDK installed? Open Google Cloud Shell (https://console.cloud.google.com, project
`clinic-management-system-12-23`), upload `cors.json`, then run the same command.

To verify:
- `gcloud storage buckets describe gs://europe-west1-storage-1 --format="default(cors_config)"`
- or `gsutil cors get gs://europe-west1-storage-1`

When adding a new deployment domain, add it to `cors.json` and re-apply. CORS preflight
results are cached (`maxAgeSeconds`), so allow some time or hard-refresh after changes.

# Analytics events

Full write-up (onboarding + analytics): **[docs/onboarding-and-analytics.md](docs/onboarding-and-analytics.md)**

Product activation events are sent to **Firebase Analytics** via `AnalyticsService`
(`src/app/core/service/analytics.service.ts`). They measure how new clinics move through
signup, setup, and subscription — not day-to-day clinical usage.

**Privacy:** No patient or doctor PII is included in event payloads (only booleans and
Stripe `price_id` values). Doctor identity is linked via Firebase Analytics **`setUserId`**
using the opaque Firebase Auth UID (same as `doctor.id`), set on login/signup and cleared
on logout. Logging is wrapped in try/catch so analytics never blocks clinical workflows.

**Deduplication:** Some events fire at most **once per doctor per browser**, using
localStorage keys `cw_analytics_{suffix}_{doctorId}`. If the user clears site data or
uses another device, the event may fire again.

## Activation funnel (in order)

These events describe the ideal path from signup to paid plan:

```
signup_complete
  → email_verified
  → profile_completed
  → first_patient_added
  → first_appointment_created
  → onboarding_completed
  → checkout_started
```

| Event | Parameters | Once per doctor? | When it fires | Trigger location |
|-------|------------|------------------|---------------|------------------|
| `signup_complete` | — | No | A new doctor account is created and saved to Firestore | `FirebaseAuthenticationService.signup()` |
| `email_verified` | — | Yes | Firebase Auth reports the doctor’s email as verified (e.g. after clicking the verification link and the session reloads) | `FirebaseAuthenticationService.traceAuthenticationStatus()` |
| `profile_completed` | — | Yes | The doctor has both a **phone number** and a **brand logo** saved (matches the onboarding “Complete your profile” step) | `OnboardingService.recordProfileIfComplete()` — called after saving settings or uploading a logo in doctor profile |
| `patient_added` | `first` (boolean) | No | Any patient record is added | `OnboardingService.recordPatientAdded()` |
| `first_patient_added` | — | Yes* | The clinic’s **first** patient is added (`first: true` on `patient_added` is also sent) | Same as `patient_added`, when it is the first patient |
| `appointment_created` | `first` (boolean) | No | Any appointment is saved | `OnboardingService.recordAppointmentCreated()` |
| `first_appointment_created` | — | Yes* | The clinic’s **first** appointment is saved | Same as `appointment_created`, when it is the first appointment |
| `onboarding_completed` | — | Yes | All three onboarding checklist steps are done: profile (phone + logo), first patient, first appointment | `OnboardingService.maybeRecordOnboardingComplete()` — after profile, patient, or appointment milestones |
| `checkout_started` | `price_id` (string) | No | The doctor is redirected to the Stripe checkout page (does **not** mean payment succeeded) | `DoctorPlansComponent.pay()` |

\*First-patient and first-appointment events are deduplicated via onboarding localStorage
flags (`cw_onboarding_patient_*`, `cw_onboarding_appointment_*`), not the analytics
once-per-doctor keys.

## Onboarding checklist UX events

These track how doctors interact with the dashboard “Get started” checklist. They are not
part of the core monetization funnel but help measure whether the checklist is useful.

| Event | Parameters | When it fires | Trigger location |
|-------|------------|---------------|------------------|
| `onboarding_remind_later` | — | Doctor clicks **Remind me later** (checklist hidden for 7 days) | `OnboardingService.remindLater()` |
| `onboarding_dismiss_permanent` | — | Doctor clicks **Don’t show again** | `OnboardingService.dismissPermanently()` |

## Monetization events

| Event | Parameters | When it fires | Trigger location |
|-------|------------|---------------|------------------|
| `billing_portal_opened` | `source` (`doctor_plans` \| `header`) | Stripe billing portal URL is returned and the user is redirected | `DoctorPlansComponent.openBillingPortal()`, `HeaderComponent.openBillingPortal()` |

## Notes

- **`checkout_started` vs. paid subscription:** This event fires when checkout **opens**,
  not when Stripe confirms payment. Use backend/Stripe webhook data for true conversion.
- **`profile_completed` criteria:** Phone and logo must both be non-empty on the in-memory
  doctor user (same rules as the onboarding checklist).
- **Adding a new event:** Add a method to `AnalyticsService`, keep payloads free of PII,
  and document it in this table.

