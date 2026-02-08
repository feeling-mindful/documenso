#!/usr/bin/env bash
#
# Sync .env.local → Vercel production environment variables.
# Usage: ./scripts/sync-env-to-vercel.sh [environment]
#   environment: production (default), preview, development
#
# Reads every KEY=VALUE from .env.local (skipping comments and blanks),
# removes the existing var on Vercel, then re-adds it.
#
set -euo pipefail

ENV_FILE=".env.local"
TARGET="${1:-production}"

# Vars managed by Vercel itself — never overwrite these
SKIP_VARS="VERCEL_OIDC_TOKEN"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Run from the repo root."
  exit 1
fi

if ! command -v vercel &>/dev/null; then
  echo "Error: vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

echo "Syncing $ENV_FILE → Vercel ($TARGET)..."
echo ""

count=0
skipped=0

while IFS= read -r line; do
  # Skip comments and blank lines
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  # Parse KEY="VALUE" or KEY=VALUE
  key="${line%%=*}"
  value="${line#*=}"

  # Strip surrounding quotes
  value="${value#\"}"
  value="${value%\"}"

  # Skip Vercel-managed vars
  if [[ " $SKIP_VARS " == *" $key "* ]]; then
    echo "  SKIP  $key (Vercel-managed)"
    ((skipped++))
    continue
  fi

  # Remove existing var (ignore errors if it doesn't exist)
  vercel env rm "$key" "$TARGET" --yes 2>/dev/null || true

  # Add the new value
  echo -n "$value" | vercel env add "$key" "$TARGET" 2>/dev/null
  echo "  SYNC  $key"
  ((count++))
done < "$ENV_FILE"

echo ""
echo "Done. Synced $count vars, skipped $skipped. Target: $TARGET"
echo ""
echo "Next: run 'vercel --prod' to redeploy with the new env vars."
