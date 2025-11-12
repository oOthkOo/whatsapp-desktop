![downloads](https://img.shields.io/github/downloads/oOthkOo/whatsapp-desktop/total?style=for-the-badge)

# WhatsApp Desktop

![screenshot](https://github.com/oOthkOo/whatsapp-desktop/blob/master/screenshots/whatsapp-screen.png "Main Window")

Unofficial WhatsApp Desktop Client for OSX, Linux and Windows. Build with [Electron](http://electron.atom.io/).  

This is **NOT** an official product. This project does not attempt to reverse engineer the WhatsApp API or attempt to reimplement any part of the WhatsApp client. Any communication between the user and WhatsApp servers is handled by official WhatsApp Web itself; this is just a native wrapper for WhatsApp Web, like a browser.

Original versions of WhatsApp Desktop was written by:
* @bcalik : https://github.com/bcalik/Whatsapp-Desktop
* @Enrico204 : https://github.com/Enrico204/Whatsapp-Desktop

## Features

* Cross platform (OSX, Windows x64, Linux ia32/x64 and ARM v7l)
* Native notifications
* System tray icon
* Open links in browser
* Badge with the number of notifications in the dock/taskbar
* Dock icon bounces when a new message is received
* Focus on contact search input via CMD+F (WIN+F)
* Phone info window (s/w versions, battery status, etc)
* Auto-launch on login
* Start minimized to tray icon
* Logging system (log to console and *userData*/log.log)
* Apply custom CSS stylesheet
* Auto-hide menu bar (Windows, Linux)
* Disabling GPU rendering (useful when dealing with bugged video drivers)
* A couple of things can be configured:
  * Toggle avatar visibility
  * Toggle preview of the messages visibility
  * Set the size for the media thumbs
  * Proxy settings connect to WhatsApp web

## Download WhatsApp

* Windows 10 - [Download](https://github.com/oOthkOo/whatsapp-desktop/releases/download/v0.5.3/WhatsApp-win32-x64.zip) - ![Stats](https://img.shields.io/github/downloads/oOthkOo/whatsapp-desktop/latest/WhatsApp-win32-x64.zip?style=flat-square)
* Mac OSX - [Download](https://github.com/oOthkOo/whatsapp-desktop/releases/download/v0.5.3/WhatsApp-darwin-x64.zip) - ![Stats](https://img.shields.io/github/downloads/oOthkOo/whatsapp-desktop/latest/WhatsApp-darwin-x64.zip?style=flat-square)
* Ubuntu (32 bits) - [Download](https://github.com/oOthkOo/whatsapp-desktop/releases/download/v0.5.3/whatsapp-desktop-x32.deb) - ![Stats](https://img.shields.io/github/downloads/oOthkOo/whatsapp-desktop/latest/whatsapp-desktop-x32.deb?style=flat-square)
* Ubuntu (64 bits) - [Download](https://github.com/oOthkOo/whatsapp-desktop/releases/download/v0.5.3/whatsapp-desktop-x64.deb) - ![Stats](https://img.shields.io/github/downloads/oOthkOo/whatsapp-desktop/latest/whatsapp-desktop-x64.deb?style=flat-square)

Donations
-----

:heart: Donations are always welcome :heart:.

Coins | Symbols | Addresses
--- | --- | ---
<img width="32" src="https://github.com/oOthkOo/hyper-manager/blob/main/pictures/btc.svg" alt="Bitcoin"/> | BTC | 3B52fbzNFQTaKZxWf5GrCUsASD2UP8na4A
<img width="32" src="https://github.com/oOthkOo/hyper-manager/blob/main/pictures/eth.svg" alt="Ethereum"/> | ETH | 0x1C389f1f85Cdb3C2996b83fAc87E496A80698B7C
<img width="32" src="https://github.com/oOthkOo/hyper-manager/blob/main/pictures/sol.svg" alt="Solana"/> | SOL | F14pWhGjGLcCF8RMk4JhbK2kD49iBBwa9KFygRJo54Fm

## Build WhatsApp Debian/Ubuntu packages

Follow these instructions to install `whatsapp-desktop` on your system.

### Install NPM and Yarn

You need NPM and Yarn to be installed on your system before building deb package.

* NPM  : https://nodejs.org/en/download/package-manager/
* Yarn : https://yarnpkg.com/lang/en/docs/install/

### Build Linux 32/64 bits packages

You can build `whatsapp-desktop-xxx.deb` package with:

```sh
git clone https://github.com/oOthkOo/whatsapp-desktop.git
cd whatsapp-desktop
./scripts/build-deb-x64.sh # or ./scripts/build-deb-x32.sh for 32 bits
```

You'll find debian packages into `build/releases` directory.

### Install WhatsApp on Debian, Ubuntu, Mint, ...

```sh
sudo apt install ./build/releases/whatsapp-desktop-x64.deb
sudo apt install -f
```

## Command line switches

    --debug-log         Switch file's log level to "debug" (default: "warn")

## Contributions

Contributions are welcome! For feature requests and bug reports please submit an [issue](https://github.com/oOthkOo/whatsapp-desktop/issues).

## Build from source

To build from the source, run the following commands:

```sh
yarn install
yarn run build:{platform}
```

Platform | OS
--- | ---
win | Windows only
osx | OSX only
osxm1 | OSX arm64 (m1)
linux | Linux 64 bits
linux32 | Linux 32 bits
linuxarmv7l | ARM Linux

You'll find artifacts into `build/dist/` directory.

## Run on-the-fly (for devs)

If you're a developer, you may want to use directly `yarn run dev` (in project root) instead of compiling the code each time. Please note that autostart feature will not work in this mode.

### Cross-build for Windows (from Linux/macOS)

Wine needs to be installed. On macOS, it is installable via Homebrew:  

    brew install wine

On GNU/Linux you can install `wine` from your distro package manager.

Please mind that `wine` requires an Xorg display, so you should set correctly your DISPLAY env var (you can use `Xvfb` if you don't have/want a real Xorg display running)
