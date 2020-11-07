# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Exit on unset variable.
set -u

# Ensure the script is executed from the repo root.
if [ ! -d "scripts" ] 
then
    echo "This should be run from the repository root and not inside the scripts folder." 
    exit 1
fi

# Ensure variables are loaded.
source app.config

# Enable APIs
echo
echo "# Enabling APIs"
echo
gcloud services enable appengine.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Setup Firestore
echo
echo "# Setting up Firestore for High Score database"
echo
gcloud app create --region=$APPENGINE_REGION # Create App Engine app 
sleep 5
gcloud firestore databases create --region $APPENGINE_REGION # Create Native Firestore database

# Setup Firebase
echo
echo "# Setting up Firebase"
echo
firebase projects:addfirebase $PROJECT_ID
firebase apps:create web $APP_NAME --project=$PROJECT_ID
# Notify user to overwrite
echo 
echo "# Exporting Firebase config into code. Select 'Y' if prompted."
echo
sleep 5
firebase apps:sdkconfig -o public/js/init-firebase.js --project=$PROJECT_ID


