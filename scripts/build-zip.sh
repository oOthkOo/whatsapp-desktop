#!/bin/bash

source ./scripts/constants.sh

npm install
electron-packager ./app $APP_NAME \
 --overwrite \
 --out=$DIST_DIR \
 --package-manager=yarn \
 --platform=$APP_PLATFORM \
 --arch=$APP_ARCH \
 --electron-version=$ELECTRON_VERSION \
 --icon=$BUILD_DIR/$APP_ICON_PATH

FILE_NAME=$APP_NAME-$APP_PLATFORM-$APP_ARCH
APP_DIR=$DIST_DIR/$FILE_NAME

cd $APP_DIR
zip -r $FILE_NAME.zip *
cd ../../../
pwd
mv $APP_DIR/$FILE_NAME.zip $RELEASES_DIR
