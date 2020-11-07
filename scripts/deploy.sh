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
    echo "This should be run from the repostiory root and not inside the scripts folder." 
    exit 1
fi

# Ensure variables are loaded.
source app.config

# Deploy to Cloud Run
gcloud builds submit --tag gcr.io/$PROJECT_ID/$APP_NAME \
  --project $PROJECT_ID
gcloud beta run deploy $APP_NAME \
  --image gcr.io/$PROJECT_ID/$APP_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --project $PROJECT_ID \
  --update-env-vars APP_NAME=$APP_NAME,COLLECTION_NAME=$COLLECTION_NAME \
