#!/bin/sh

rm -R build/whatsapp-desktop
mkdir -p build/whatsapp-desktop/DEBIAN/opt/
cp build/debian/* build/whatsapp-desktop/DEBIAN
mkdir -p build/whatsapp-desktop/DEBIAN/usr/share/applications/
mkdir -p build/whatsapp-desktop/DEBIAN/usr/share/icons/hicolor/128x128/apps/
mkdir -p build/whatsapp-desktop/DEBIAN/usr/share/icons/hicolor/64x64/apps/
cp "app/assets/icon/icon@2x.png" build/whatsapp-desktop/DEBIAN/usr/share/icons/hicolor/128x128/apps/whatsapp.png
cp "app/assets/icon/icon.png" build/whatsapp-desktop/DEBIAN/usr/share/icons/hicolor/64x64/apps/whatsapp.png
cp whatsappdesktop.desktop build/whatsapp-desktop/DEBIAN/usr/share/applications/
cp -r dist/WhatsApp-linux-x64/* build/whatsapp-desktop/DEBIAN/opt/
dpkg-deb --build build/whatsapp-desktop
