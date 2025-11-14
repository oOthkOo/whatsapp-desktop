#!/bin/bash

export APP_ARCH="arm64"
export APP_PLATFORM="darwin"
export APP_ICON_PATH="assets/osx/whatsapp.icns"

./scripts/build-zip.sh
