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
