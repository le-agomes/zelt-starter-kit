#!/bin/bash

# Supabase Edge Functions Deployment Script
# This script deploys all edge functions to production

set -e

echo "🚀 Starting Supabase Edge Functions Deployment"
echo "================================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Please install it first: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Login check
echo "Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "❌ You need to login to Supabase first."
    echo "Run: supabase login"
    exit 1
fi

# Link project
echo "Linking to Supabase project..."
supabase link --project-ref qziltegbxmsmnsifuast

# List of all functions
FUNCTIONS=(
    "cancel-run"
    "complete-step"
    "create-run"
    "duplicate-workflow"
    "get-org-settings"
    "invite-user"
    "post-signin"
    "reassign-step"
    "reorder-steps"
    "save-org-settings"
    "skip-step"
    "toggle-run-pause"
    "update-user-profile"
)

# Deploy each function
TOTAL=${#FUNCTIONS[@]}
CURRENT=0

echo ""
echo "Deploying ${TOTAL} edge functions..."
echo ""

for func in "${FUNCTIONS[@]}"; do
    CURRENT=$((CURRENT + 1))
    echo "[$CURRENT/$TOTAL] Deploying: $func"

    if supabase functions deploy "$func" --no-verify-jwt 2>&1; then
        echo "✅ Successfully deployed: $func"
    else
        echo "❌ Failed to deploy: $func"
        exit 1
    fi

    echo ""
done

echo "================================================"
echo "✅ All edge functions deployed successfully!"
echo ""
echo "You can view them at:"
echo "https://supabase.com/dashboard/project/qziltegbxmsmnsifuast/functions"
echo ""
