#!/bin/bash

source ./scripts/constants.sh

npm install
electron-packager ./app $APP_NAME \
 --overwrite \
 --out=$DIST_DIR \
 --package-manager=yarn \
 --platform=linux \
 --arch=$APP_ARCH \
 --electron-version=$ELECTRON_VERSION \
 --icon=$BUILD_DIR/assets/win/whatsapp.ico

WORK_DIR=$OUTPUT_DIR"/whatsapp-linux-"$APP_ARCH

rm -R $OUTPUT_DIR
mkdir -p $WORK_DIR/DEBIAN
cp $TEMPLATES_DIR/debian/$APP_ARCH/* $WORK_DIR/DEBIAN
cp $TEMPLATES_DIR/debian/changelog $WORK_DIR/DEBIAN
sed -i "s/{version}/${APP_VERSION}/g" $WORK_DIR/DEBIAN/control
mkdir -p $WORK_DIR/opt/whatsapp-desktop/
mkdir -p $WORK_DIR/usr/share/applications/
mkdir -p $WORK_DIR/usr/share/icons/hicolor/128x128/apps/
mkdir -p $WORK_DIR/usr/share/icons/hicolor/64x64/apps/
cp "app/assets/icon/icon@2x.png" $WORK_DIR/usr/share/icons/hicolor/128x128/apps/whatsapp.png
cp "app/assets/icon/icon.png" $WORK_DIR/usr/share/icons/hicolor/64x64/apps/whatsapp.png
cp $TEMPLATES_DIR/whatsapp.desktop $WORK_DIR/usr/share/applications/
sed -i "s/{version}/${APP_VERSION}/g" $WORK_DIR/usr/share/applications/whatsapp.desktop
cp -r $BUILD_DIR/dist/WhatsApp-linux-$APP_ARCH/* $WORK_DIR/opt/whatsapp-desktop/
dpkg-deb --build $WORK_DIR
mv $WORK_DIR.deb $RELEASES_DIR
