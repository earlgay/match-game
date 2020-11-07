# Match Game

## Prequisites
1. [gcloud](https://cloud.google.com/sdk)
1. [firebase-tools](https://github.com/firebase/firebase-tools)

## Setup
1. Configure Google Cloud SDK: `gcloud config set project [PROJECT_NAME]`
1. Ensure logged in to firebase-tools as same user as GCP: `firebase login`
1. Configure variables in `app.config`
1. Setup Firestore and Firebase: `./scripts/setup.sh`
1. If prompted to enable APIs or overwrite files, select `Y`.

## Deploy
1. Deploy application to Cloud Run: `./scripts/deploy.sh`

## Configure
1. Load config: `source app.config`
1. Get Cloud Run URL: `gcloud run services describe $APP_NAME --platform managed --region=$REGION --format="value(status.address.url)"`
1. Open Firebase Auth console in browser: `firebase open auth --project $(gcloud config get-value project)`
1. In Firebase Auth console, select 'Get Started'.
1. In Firebase Auth console, enable Google as sign-in method. Set "Project public-facing name" to what users should see as application name.
1. In Firebase Auth console, add Cloud Run URL to "Authorized Domains" list.

## More information on FirebaseUI and Firebase Authentication
Check out the docs for [FirebaseUI](https://firebase.google.com/docs/auth/web/firebaseui)
and [Firebase Authentication](https://firebase.google.com/docs/auth).

