#!/bin/bash
echo "Checking Cloud Run service status..."
echo "Latest deployment revision:"
gcloud run revisions list --service=disease-community-api --region=asia-northeast1 --limit=1 --format="table(metadata.name,status.conditions[0].status,status.conditions[0].message)" 2>/dev/null || echo "gcloud not available locally"
echo ""
echo "To check logs in Google Cloud Console:"
echo "https://console.cloud.google.com/logs/query?project=circles-202510&query=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22disease-community-api%22%0Aseverity%3E%3DERROR"
