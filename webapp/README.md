# DMV Practice Test Email Server

A simple Node.js server that sends DMV practice test results via email.

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   EMAIL_USER=your-gmail-address
   EMAIL_PASS=your-app-password
   PORT=8080
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## Deployment to Google Cloud Run

### Manual Deployment

1. Build the Docker image:
   ```
   docker build -t dmv-webapp .
   ```

2. Test the container locally:
   ```
   docker run -p 8080:8080 --env-file .env.production dmv-webapp
   ```

3. Tag the image for Google Container Registry:
   ```
   docker tag dmv-webapp gcr.io/YOUR_PROJECT_ID/dmv-webapp
   ```

4. Push to Google Container Registry:
   ```
   docker push gcr.io/YOUR_PROJECT_ID/dmv-webapp
   ```

5. Deploy to Cloud Run:
   ```
   gcloud run deploy dmv-webapp \
     --image gcr.io/YOUR_PROJECT_ID/dmv-webapp \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### Automated Deployment with Cloud Build

To set up continuous deployment:

1. Connect your GitHub repository to Google Cloud Build
2. Configure the build trigger to use the `cloudbuild.yaml` file
3. Set up secret manager for environment variables:
   ```
   gcloud secrets create EMAIL_USER --replication-policy automatic
   gcloud secrets create EMAIL_PASS --replication-policy automatic
   ```

4. Update the Cloud Run service to use the secrets:
   ```
   gcloud run services update dmv-webapp \
     --update-secrets=EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest
   ```