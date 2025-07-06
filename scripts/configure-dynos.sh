#!/usr/bin/env bash
set -euo pipefail

# Environment
APP_NAME="${HEROKU_APP_NAME:-${APP_NAME:-}}"
DYNOS="${DYNOS:-web,worker}"

if [[ -z "$APP_NAME" ]]; then
  echo "APP_NAME or HEROKU_APP_NAME env var must be set" >&2
  exit 1
fi

heroku container:login

IFS=',' read -ra PROCESS_TYPES <<< "$DYNOS"

echo "Deploying process types: ${PROCESS_TYPES[*]} to app $APP_NAME"

for PROC in "${PROCESS_TYPES[@]}"; do
  IMAGE_PATH=""
  case "$PROC" in
    web)
      IMAGE_PATH="./products/backend"
      ;;
    poller)
      IMAGE_PATH="./products/poller"
      ;;
    *)
      echo "Unknown process type $PROC – skipping." >&2
      continue
      ;;
  esac

  echo "Building $PROC image from $IMAGE_PATH"
  docker build -t registry.heroku.com/${APP_NAME}/${PROC} "$IMAGE_PATH"
  docker push registry.heroku.com/${APP_NAME}/${PROC}

done

# Release all built images
heroku container:release ${DYNOS//,/ } --app "$APP_NAME"

echo "Dyno images released successfully."