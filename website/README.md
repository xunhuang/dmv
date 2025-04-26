# California DMV Practice Tests

A web application for practicing California DMV tests, built with React and Vite.

## Development

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with required environment variables (see `.env.example`).

3. Start the development server:

```bash
npm run dev
```

## Building for Production

```bash
npm run build
```

This will generate static files in the `dist` directory.

## Deploying to Google Cloud Run

### Prerequisites

- Google Cloud CLI installed and configured
- Docker installed (for local testing)

### Deployment Steps

#### Option 1: Manual Deployment

1. Build the Docker image:

```bash
docker build -t dmv-webapp .
```

2. Test locally:

```bash
docker run -p 8080:8080 dmv-webapp
```

3. Tag and push to Google Container Registry:

```bash
docker tag dmv-webapp gcr.io/YOUR_PROJECT_ID/dmv-webapp
docker push gcr.io/YOUR_PROJECT_ID/dmv-webapp
```

4. Deploy to Cloud Run:

```bash
gcloud run deploy dmv-webapp \
  --image gcr.io/YOUR_PROJECT_ID/dmv-webapp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Option 2: Automated Deployment with Cloud Build

Set up a Cloud Build trigger for your repository and it will automatically build and deploy using the `cloudbuild.yaml` configuration.

## Environment Variables

- `VITE_EMAIL_SERVER_URL`: URL of the email service API