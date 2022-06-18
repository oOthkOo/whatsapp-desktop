#!/bin/sh

npm install
npm run build:linux32

ASSETS_DIR="assets"
BUILD_DIR="build"
RELEASES_DIR="$BUILD_DIR/releases"
TEMPLATES_DIR="$BUILD_DIR/templates"
OUTPUT_DIR="$BUILD_DIR/outputs"
WORK_DIR="$OUTPUT_DIR/whatsapp-desktop-x32"

rm -R $OUTPUT_DIR
mkdir -p $WORK_DIR/DEBIAN
cp $TEMPLATES_DIR/debian-x32/* $WORK_DIR/DEBIAN
mkdir -p $WORK_DIR/opt/whatsapp-desktop/
mkdir -p $WORK_DIR/usr/share/applications/
mkdir -p $WORK_DIR/usr/share/icons/hicolor/128x128/apps/
mkdir -p $WORK_DIR/usr/share/icons/hicolor/64x64/apps/
cp "app/assets/icon/icon@2x.png" $WORK_DIR/usr/share/icons/hicolor/128x128/apps/whatsapp.png
cp "app/assets/icon/icon.png" $WORK_DIR/usr/share/icons/hicolor/64x64/apps/whatsapp.png
cp $TEMPLATES_DIR/whatsapp.desktop $WORK_DIR/usr/share/applications/
cp -r $BUILD_DIR/dist/WhatsApp-linux-ia32/* $WORK_DIR/opt/whatsapp-desktop/
dpkg-deb --build $WORK_DIR
mv $WORK_DIR.deb $RELEASES_DIR
