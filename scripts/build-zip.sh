#!/bin/bash

source ./scripts/constants.sh

npm install
cd app && npm prune --production && cd ..
if [ "$APP_PLATFORM" == "win32" ] && ! command -v wine &> /dev/null; then
    echo "Wine is not installed. Skipping Windows icon injection."
    ICON_ARG=""
else
    ICON_ARG="--icon=$BUILD_DIR/$APP_ICON_PATH"
fi

electron-packager ./app $APP_NAME \
 --overwrite \
 --prune=true \
 --out=$DIST_DIR \
 --package-manager=yarn \
 --platform=$APP_PLATFORM \
 --arch=$APP_ARCH \
 --electron-version=$ELECTRON_VERSION \
 $ICON_ARG

FILE_NAME=$APP_NAME-$APP_PLATFORM-$APP_ARCH
APP_DIR=$DIST_DIR/$FILE_NAME

cd $APP_DIR || exit 1
zip -r $FILE_NAME.zip *
cd -
mv $APP_DIR/$FILE_NAME.zip $RELEASES_DIR
