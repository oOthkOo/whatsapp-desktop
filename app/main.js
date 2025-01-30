(function(scope) {
    "use strict";

    const pkg = require('./package')
    const agents = require('./agents')
    const electron = require('electron')
    const fs = require('fs')
    const request = require('request')
    const nodeGettext = require('node-gettext')
    const gettextParser = require('gettext-parser')
    const AutoLaunch = require('auto-launch')
    const log = require('electron-log')
    const join = require('path').join
    const notifier = require('node-notifier')
    const ContextMenu = require('electron-context-menu')

    const app = electron.app
    const AppMenu = electron.Menu
    const MenuItem = electron.MenuItem
    const AppTray = electron.Tray
    const NativeImage = electron.nativeImage
    const BrowserWindow = electron.BrowserWindow
    const globalShortcut = electron.globalShortcut

    const isAlreadyLocked = app.requestSingleInstanceLock()
    app.on('second-instance', (event, argv, workingDir) => {
        if (whatsApp.window) {
            if (whatsApp.window.isMinimized()) {
                whatsApp.window.restore()
            }
            whatsApp.window.show()
        }

        var groupLinkOpenRequested = null
        if (argv.length > 1) {
            for(var i = 0; i < argv.length; i++) {
                if (argv[i].indexOf("https://chat.whatsapp.com") >= 0) {
                    groupLinkOpenRequested = argv[i]
                    log.info("Opening a group link: " + groupLinkOpenRequested)
                    break
                }
            }
        }
        if (groupLinkOpenRequested != null) {
            whatsApp.window.webContents.executeJavaScript(
                "var el = document.createElement('a');\
                el.href = \"" + groupLinkOpenRequested + "\"; \
                el.style.display = \"none\"; \
                el.rel = 'noopener noreferrer'; \
                el.id = 'newlink'; \
                document.body.appendChild(el); \
                setTimeout(function() { var el = document.getElementById('newlink'); el.click(); document.body.removeChild(el); }, 500); \
                "
            )
        }
    })

    // Needed for @electron/remote to work.
    app.on('browser-window-created', (_, window) => {
        require("@electron/remote/main").enable(window.webContents)
    })

    if (!isAlreadyLocked) {
        app.quit()
    }

    app.setAppUserModelId('whatsapp-desktop')
    app.setAsDefaultProtocolClient('whatsapp')

    if (process.argv.indexOf('--debug-log') >= 0) {
        log.transports.file.level = 'debug'
        log.info("Log level set from command line switch")
    }
    if (process.argv.indexOf('--disable-gpu') >= 0) {
        log.warn('Disabling GPU acceleration')
        app.disableHardwareAcceleration()
    }

    const userDataDir = app.getPath('userData')
    log.info(`Log init, file '${userDataDir}/whatsapp.log'`)

    var groupLinkOpenRequested = null
    if (process.argv.length > 1) {
        for (var i = 0; i < process.argv.length; i++) {
            if (process.argv[i].indexOf("https://chat.whatsapp.com") >= 0) {
                groupLinkOpenRequested = process.argv[i]
                log.info(`Opening a group link: ${groupLinkOpenRequested}`)
                break
            }
        }
    }

    var supportedLocales = [
      'en_US',
      'it_IT'
    ]

    global.gt = new nodeGettext()
    for (var i in supportedLocales) {
        const locale = supportedLocales[i]
        let messagesFile = `${process.resourcesPath}/app/locale/${locale}/messages.po`
        if (!fs.existsSync(messagesFile)) {
          messagesFile = `./app/locale/${locale}/messages.po`
        }
        log.info(`Loading locale: ${locale}`)
        gt.addTranslations(locale, 'messages', gettextParser.po.parse(fs.readFileSync(messagesFile)))
    }
    gt.setLocale('en_US')
    gt.setTextDomain('messages')
    global._ = function (t) {
        return gt.gettext(t)
    }

    // Setting default language to system language if available
    var syslang = (process.env.LC_ALL != undefined ? process.env.LC_ALL :
        (process.env.LANG != undefined ? process.env.LANG :
            (process.env.LC_MESSAGES != undefined ? process.env.LC_MESSAGES : 'en-US')))
    if (supportedLocales.indexOf(syslang.split(".")[0]) >= 0) {
        log.info("Setting locale " + syslang.split(".")[0])
        gt.setLocale(syslang.split(".")[0])
    }
    else {
        log.warn("No supported locale found, defaulting to en_US")
    }

    global.autolauncher = new AutoLaunch({
        name: app.getName()
    })
    global.onlyOSX = function(callback) {
        if (process.platform === 'darwin') {
            return Function.bind.apply(callback, this, [].slice.call(arguments, 0))
        }
        return function () {}
    }
    global.onlyLinux = function(callback) {
        if (process.platform === 'linux') {
            return Function.bind.apply(callback, this, [].slice.call(arguments, 0))
        }
        return function() {}
    }
    global.onlyWin = function(callback) {
        if (process.platform === 'win32' || process.platform === 'win64') {
            return Function.bind.apply(callback, this, [].slice.call(arguments, 0))
        }
        return function() {}
    }
    global.config = {
        defaultSettings: {
            width: 1000,
            height: 720,
            thumbSize: 0
        },

        currentSettings: {},

        init() {
            config.loadConfiguration()
            config.saveTimeout = null
        },

        loadConfiguration() {
            log.info("Loading configuration")
            var settingsFile = app.getPath('userData') +"/settings.json"
            try {
                var data = fs.readFileSync(settingsFile)
                if (data != "" && data != "{}" && data != "[]") {
                    config.currentSettings = JSON.parse(data)
                    log.info("Configuration loaded from " + settingsFile)
                }
                else {
                    config.currentSettings = config.defaultSettings
                    log.warn("Configuration file empty, loading default")
                }
            }
            catch (e) {
                config.currentSettings = config.defaultSettings
                log.warn("Error loading configuration from " + settingsFile + " (" + e + "), loading default")
            }
            // First time configuration - eg. before app init
            if(config.get("disablegpu") == true) {
                log.warn("Disabling GPU acceleration")
                app.disableHardwareAcceleration()
            }
        },

        applyConfiguration() {
            log.info("Applying configuration")
            if (config.get("maximized") && config.get("startminimized") != true) {
                whatsApp.window.maximize()
            }
            whatsApp.window.webContents.on('dom-ready', function (event, two) {
                var fontSize = config.get("fontSize")
                fontSize = (fontSize == undefined) ? "normal" : fontSize

                var fontCSS = (fontSize != "normal") ? "font-size:" + fontSize + " !important;" : ""
                this.insertCSS('* { text-rendering: optimizeSpeed !important; -webkit-font-smoothing: subpixel-antialiased !important; '
                    + fontCSS + '}')

                var imgpath = config.get("background-image")
                if (imgpath != undefined) {
                    var img = new Buffer(fs.readFileSync(imgpath)).toString('base64')
                    var opacity = parseFloat(config.get("background-opacity"))/100.0
                    var mime = (imgpath.endsWith(".jpg") || imgpath.endsWith(".jpeg"))?"image/jpg":
                        ((imgpath.endsWith(".png")?"image/png":((imgpath.endsWith(".gif")?"image/gif":""))))
                }

                var noAvatar = '.chat-avatar img { display: none !important; }'
                var noPreview = '.chat-secondary .chat-status{z-index: -999;}'

                var thumbSize = '.image-thumb { width: '+ config.currentSettings.thumbSize + 'px  !important;' +
                'height: '+ config.currentSettings.thumbSize + 'px !important;}' +
                '.image-thumb img.image-thumb-body { width: auto !important;' +
                'height: '+ config.currentSettings.thumbSize + 'px !important;}'

                var darkMode = '#pane-side, #pane-side div div div div div div, #side header, #side header div div \
                #side div, #side div div, #side div div button, #side div div label, #side div div input, \
                #main footer, #main footer div, #main footer div div, #main header, #main header div div span, \
                #main header div div div span \
                { background-color: #2E2C2B !important; color: white; }\n \
                .message-in { background-color: #75706E !important; }\n \
                .message, .media-caption { color: #F0F0F0; }\n \
                .message-in .tail-container, .message-in.tail-override-right .tail-container, \
                .message-out.tail-override-right .tail-container, .message-in.tail-override-left \
                .tail-container { background-image: none !important; }\n \
                .block-compose, .block-compose .input-container { background-color: #2E2C2B !important; }\n \
                .pane-chat-header, .chat.active, .chat, .chatlist-panel-search, .pane-header.pane-list-header, \
                .input-chatlist-search, .chatlist-panel-body, .chatlist-panel-search div label input, \
                .chatlist-panel-search div label, #app > div > div > div._3q4NP._1Iexl > div, .message > div > span \
                 { background-color: #2E2C2B !important;, background-image: none !important; }\n \
                .chat-title, .header-title, .chat-body div span { color: white; }';

                var blurImages = "div.message-in img, div.message-out img { filter: contrast(25%) blur(8px) grayscale(75%); } \n \
                div.message-in:hover img, div.message-out:hover img { filter: none; }";

                if (config.currentSettings.hideAvatars) {
                    this.insertCSS(noAvatar)
                }
                if (config.currentSettings.hidePreviews){
                    this.insertCSS(noPreview)
                }
                if (config.currentSettings.darkMode){
                    this.insertCSS(darkMode)
                }
                if (config.currentSettings.blurImages) {
                    this.insertCSS(blurImages)
                }

                if (config.currentSettings.thumbSize) {
                    this.insertCSS(thumbSize)
                }
                if (config.get("customcss") != undefined) {
                    try {
                        this.insertCSS(fs.readFileSync(config.get("customcss"), "utf-8"))
                        log.info("Loaded CSS file: " + config.get("customcss"))
                    }
                    catch (e) {
                        log.error("CSS error: " + e)
                    }
                }
            })

            if (config.get("useProxy")) {
                var session = whatsApp.window.webContents.session
                var httpProxy = config.get("httpProxy")
                var httpsProxy = config.get("httpsProxy") || httpProxy
                if(httpProxy) {
                    log.info("Proxy configured: " + "http="+ httpProxy +";https=" + httpsProxy)
                    session.setProxy("http="+ httpProxy +";https=" + httpsProxy, function(){})
                }
                else {
                    log.info("No proxy")
                }
            }

            // OSX Dock menu
            if (process.platform == 'darwin') {
                const dockMenu = AppMenu.buildFromTemplate([
                  {label: 'Show main window', click () {
                      whatsApp.window.show()
                      whatsApp.window.setAlwaysOnTop(true)
                      whatsApp.window.focus()
                      whatsApp.window.setAlwaysOnTop(false)
                  }}
                ])
                app.dock.setMenu(dockMenu)
                app.on('activate', (event, hasVisibleWindows) => {
                    whatsApp.window.show()
                    whatsApp.window.setAlwaysOnTop(true)
                    whatsApp.window.focus()
                    whatsApp.window.setAlwaysOnTop(false)
                })
            }

            if (config.get("trayicon") != false && whatsApp.tray == undefined) {
                whatsApp.createTray()
            }
            else if (config.get("trayicon") == false && whatsApp.tray != undefined) {
                log.info("Destroying tray icon")
                whatsApp.tray.destroy()
                whatsApp.tray = undefined
            }
            if (config.get("autostart") == true) {
                autolauncher.isEnabled().then(function(enabled) {
                    if (!enabled) {
                        autolauncher.enable()
                        log.info("Autostart enabled")
                    }
                })
            }
            else {
                autolauncher.isEnabled().then(function(enabled) {
                    if (enabled) {
                        autolauncher.disable()
                        log.info("Autostart disabled")
                    }
                })
            }
            whatsApp.window.setMenuBarVisibility(config.get("autoHideMenuBar") != true)
            whatsApp.window.setAutoHideMenuBar(config.get("autoHideMenuBar") == true)
        },

        saveConfiguration() {
            if (config.saveTimeout != null) {
                clearTimeout(config.saveTimeout)
                config.saveTimeout = null
            }
            config.saveTimeout = setTimeout(function() {
                log.info("Saving configuration")
                config.set("maximized", whatsApp.window.isMaximized())
                if (config.currentSettings == undefined || JSON.stringify(config.currentSettings) == "") {
                    // TODO: if we land here, we need to figure why and how. And fix that
                    log.error("Configuration empty! This should not happen!")
                    return
                }
                fs.writeFileSync(app.getPath('userData') + "/settings.json", JSON.stringify(config.currentSettings), 'utf-8')
                config.saveTimeout = null
            }, 2000)
        },

        get (key) {
            return config.currentSettings[key]
        },

        set (key, value) {
            config.currentSettings[key] = value
        },

        unSet (key) {
            if (config.currentSettings.hasOwnProperty(key)) {
                delete config.currentSettings[key]
            }
        }
    }

    global.config.init()

    global.whatsApp = {
        init() {
            global.whatsApp.warningIcon = false
            whatsApp.tray = undefined
            whatsApp.createMenu()
            // Bitmask: LSB
            // First bit: warning icon (phone disconnected)
            // Second bit: new message red-dot
            global.whatsApp.iconStatus = 0
            global.whatsApp.oldIconStatus = 0
            global.whatsApp.newVersion = null

            whatsApp.clearCache()
            whatsApp.openWindow()
            config.applyConfiguration()
        },

        createMenu() {
            log.info("Creating menu")
            whatsApp.menu =
                AppMenu.buildFromTemplate(require('./menu'))
                AppMenu.setApplicationMenu(whatsApp.menu)
        },

        setNormalTray() {
            global.whatsApp.iconStatus = global.whatsApp.iconStatus & 0xFFFFFFFE
            global.whatsApp.updateTrayIcon()
        },

        setWarningTray() {
            global.whatsApp.iconStatus = global.whatsApp.iconStatus | 0x00000001
            global.whatsApp.updateTrayIcon()
        },

        isWarningTrayIcon() {
            return (global.whatsApp.iconStatus & 0x1) > 0
        },

        setNewMessageIcon() {
            global.whatsApp.iconStatus = global.whatsApp.iconStatus | 0x00000002
            global.whatsApp.updateTrayIcon()
        },

        clearNewMessageIcon() {
            global.whatsApp.iconStatus = global.whatsApp.iconStatus & 0xFFFFFFFD
            global.whatsApp.updateTrayIcon()
        },

        isNewMessageIcon() {
            return (global.whatsApp.iconStatus & 0x2) > 0
        },

        updateTrayIcon() {
            if (global.whatsApp.oldIconStatus == global.whatsApp.iconStatus) {
                return
            }
            if (whatsApp.tray != undefined && process.platform != 'darwin') {
                if (global.whatsApp.isWarningTrayIcon() && !global.whatsApp.isNewMessageIcon()) {
                    log.info("Setting tray icon to warning")
                    whatsApp.tray.setImage(__dirname + '/assets/icon/iconWarning.png')
                } if (global.whatsApp.isWarningTrayIcon() && global.whatsApp.isNewMessageIcon()) {
                    log.info("Setting tray icon to warning with messages")
                    whatsApp.tray.setImage(__dirname + '/assets/icon/iconWarningWithMsg.png')
                } if (!global.whatsApp.isWarningTrayIcon() && global.whatsApp.isNewMessageIcon()) {
                    log.info("Setting tray icon to normal with messages")
                    whatsApp.tray.setImage(__dirname + '/assets/icon/iconWithMsg.png')
                } else {
                    log.info("Setting tray icon to normal")
                    whatsApp.tray.setImage(__dirname + '/assets/icon/icon.png')
                }
                log.info("Mask value: " + global.whatsApp.iconStatus)
            }
            global.whatsApp.oldIconStatus = global.whatsApp.iconStatus
        },

        createTray() {
            log.info("Creating tray icon")
            var trayImg = __dirname + '/assets/img/trayTemplate.png'
            // Darwin requires black/white/transparent icon, other platforms does not
            if (process.platform != 'darwin') {
                trayImg = __dirname + '/assets/icon/icon.png'
            }
            whatsApp.tray = new AppTray(trayImg)

            // Setting up a trayicon context menu
            whatsApp.trayContextMenu = AppMenu.buildFromTemplate([
                {label: _('Show'),
                visible: config.get("startminimized"), // Hide this option on start
                click: function() {
                    whatsApp.window.show()
                    whatsApp.window.setAlwaysOnTop(true)
                    whatsApp.window.focus()
                    whatsApp.window.setAlwaysOnTop(false)
                }},

                {label: _('Hide'),
                visible: !config.get("startminimized"), // Show this option on start
                click: function() {
                    whatsApp.window.hide()
                }},

                // Quit WhatsApp
                {label: _('Quit'), click: function() {
                    app.quit()
                }}
            ])
            whatsApp.tray.setContextMenu(whatsApp.trayContextMenu)

            // Normal this will show the main window, but electron under Linux
            // dosent work with the clicked event so we are using the above
            // contextmenu insted - Rightclick the trayicon and pick Show
            // WhatsApp
            // More info:
            // https://github.com/electron/electron/blob/master/docs/api/tray.md
            // See the Platform limitations section.
            whatsApp.tray.on('clicked', () => {
                whatsApp.window.show()
                whatsApp.window.setAlwaysOnTop(true)
                whatsApp.window.focus()
                whatsApp.window.setAlwaysOnTop(false)
            })
            whatsApp.tray.on('click', () => {
                whatsApp.window.show()
                whatsApp.window.setAlwaysOnTop(true)
                whatsApp.window.focus()
                whatsApp.window.setAlwaysOnTop(false)
            })

            whatsApp.tray.setToolTip('WhatsApp Desktop')
        },

        clearCache() {
            log.info("Clearing cache")
            try {
                fs.unlinkSync(app.getPath('userData') + '/Application Cache/Index')
            }
            catch (e) {
                log.warn("Error clearing cache: " + e)
            }
        },

        openWindow() {
            log.info("Open main window")
            whatsApp.window = new BrowserWindow({
                "y": config.get("posY"),
                "x": config.get("posX"),
                "width": config.get("width"),
                "height": config.get("height"),
                "minWidth": 600,
                "minHeight": 600,
                //"type": "toolbar",
                "title": "WhatsApp",
                "show": false,
                "autoHideMenuBar": config.get("autoHideMenuBar") == true,
                "icon": __dirname + "/assets/icon/icon.png",
                "webPreferences": {
                  "nodeIntegration": false,
                  "preload": join(__dirname, 'js', 'injected.js')
                }
            })

            ContextMenu({
                window: whatsApp.window
            })

            // Setting User Agent
            var userAgent = 'Mozilla/5.0 (X11; Linux x86_64; rv:101.0) Gecko/20100101 Firefox/101.0'

            // Pick a random user agent from agents.json
            if (agents.userAgents) {
                const userAgentIndex = Math.floor(Math.random() * agents.userAgents.length)
                userAgent = agents.userAgents[userAgentIndex]
            }
            log.info(`User Agent selected: ${userAgent}`)
            whatsApp.window.webContents.setUserAgent(userAgent)

            electron.session.defaultSession.webRequest.onBeforeSendHeaders(function (details, callback) {
                details.requestHeaders['User-Agent'] = userAgent
                callback({ cancel: false, requestHeaders: details.requestHeaders })
            })

            whatsApp.window.loadURL('https://web.whatsapp.com', {
                userAgent: userAgent
            })

            whatsApp.window.webContents.on('did-finish-load', function() {
                if (groupLinkOpenRequested != null) {
                    whatsApp.window.webContents.executeJavaScript(
                        "var el = document.createElement('a');\
                        el.href = \"" + groupLinkOpenRequested + "\"; \
                        el.style.display = \"none\"; \
                        el.rel = 'noopener noreferrer'; \
                        el.id = 'newlink'; \
                        document.body.appendChild(el); \
                        setTimeout(function() { var el = document.getElementById('newlink'); el.click(); document.body.removeChild(el); }, 500); \
                        "
                    )
                }
                /* Checking for new version
                var ep = "https://api.github.com/repos/Enrico204/Whatsapp-Desktop/releases/latest"
                log.info("Checking for new versions (current version "+pkg.version+")")
                request.get({url: ep, headers:{'User-Agent':'Whatsapp-Desktop'}}, function(err, response, body) {
                    if (!err && response != undefined && response.statusCode == 200) {
                        var ghinfo = JSON.parse(body)
                        global.whatsApp.newVersion = ghinfo['tag_name']
                        if (ghinfo['tag_name'][0] == 'v'
                                && ghinfo['tag_name'] != "v"+pkg.version
                                && ghinfo['tag_name'].indexOf("beta") == -1) {
                            log.info("A new version is available: " + ghinfo['tag_name'])
                            var options = {
                                title: "Whatsapp-Desktop",
                                message: "A new version is available, download it at https://github.com/Enrico204/Whatsapp-Desktop",
                                open: 'https://github.com/Enrico204/Whatsapp-Desktop/releases/latest',
                                sound: true
                            }
                            notifier.notify(options, function (err, response) {
                                    if (!err) log.warn("Error: " + err)
                                })
                        } else {
                            log.info("Already on latest version");
                        }
                    } else {
                        log.warn("Error checking updates (status " + (response != undefined ? response.statusCode : " not available") + "): " + err)
                    }
                })*/
            })

            if (config.get("useProxy")) {
                var session = whatsApp.window.webContents.session
                var httpProxy = config.get("httpProxy")
                var httpsProxy = config.get("httpsProxy") || httpProxy
                if (httpProxy) {
                    session.setProxy("http="+ httpProxy +";https=" + httpsProxy, () => {})
                }
            }

            if (config.get("startminimized") != true) {
                whatsApp.window.show()
            }

            whatsApp.window.on('move', (e, evt) => {
                config.set("posX", whatsApp.window.getBounds().x)
                config.set("posY", whatsApp.window.getBounds().y)
                config.set("width", whatsApp.window.getBounds().width)
                config.set("height", whatsApp.window.getBounds().height)
                config.saveConfiguration()
            })

            whatsApp.window.on('resize', (e, evt) => {
                config.set("posX", whatsApp.window.getBounds().x)
                config.set("posY", whatsApp.window.getBounds().y)
                config.set("width", whatsApp.window.getBounds().width)
                config.set("height", whatsApp.window.getBounds().height)
                config.saveConfiguration()
            })

            whatsApp.window.on('page-title-updated', onlyOSX((event, title) => {
                var count = title.match(/\((\d+)\)/)
                    count = count ? count[1] : ''
                app.dock.setBadge(count)
                log.info("Badge updated: " + count)
            }))

            whatsApp.window.on('page-title-updated', onlyLinux((event, title) => {
                var count = title.match(/\((\d+)\)/)
                    count = count ? count[1] : ''

                if (parseInt(count) > 0) {
                    if (!whatsApp.window.isFocused() && global.config.get("quietMode") !== true) {
                      log.info("Flashing frame")
                      whatsApp.window.flashFrame(true)
                    }
                    var badge = NativeImage.createFromPath(app.getAppPath() + "/assets/badges/badge-" + (count > 9 ? 0 : count) +".png")
                    whatsApp.window.setOverlayIcon(badge, "new messages")
                    global.whatsApp.setNewMessageIcon()
                }
                else {
                    whatsApp.window.setOverlayIcon(null, "no new messages")
                    global.whatsApp.clearNewMessageIcon()
                }
                log.info("Badge updated: " + count)
            }))

            whatsApp.window.on('page-title-updated', onlyWin((event, title) => {
                var count = title.match(/\((\d+)\)/)
                    count = count ? count[1] : ''

                if (parseInt(count) > 0) {
                    if (!whatsApp.window.isFocused()) {
                      whatsApp.window.flashFrame(true)
                    }
                    var badge = NativeImage.createFromPath(app.getAppPath() + "/assets/badges/badge-" + (count > 9 ? 0 : count) +".png")
                    whatsApp.window.setOverlayIcon(badge, "new messages")
                    global.whatsApp.setNewMessageIcon()
                }
                else {
                    whatsApp.window.setOverlayIcon(null, "no new messages")
                    global.whatsApp.clearNewMessageIcon()
                }
                log.info("Badge updated: " + count)
            }))

            whatsApp.window.webContents.on("new-window", (e, url) => {
                electron.shell.openExternal(url)
                e.preventDefault()
            })

            whatsApp.window.on('close', onlyOSX((e) => {
                if (whatsApp.window.forceClose !== true) {
                    e.preventDefault()
                    whatsApp.window.hide()
                }
            }))

            whatsApp.window.on('close', onlyWin((e) => {
                if (whatsApp.tray == undefined) {
                    app.quit()
                }
                else if (whatsApp.window.forceClose !== true) {
                    e.preventDefault()
                    whatsApp.window.hide()
                }
            }))

            whatsApp.window.on('close', onlyLinux((e) => {
                if (whatsApp.tray == undefined) {
                    app.quit()
                }
                else if (whatsApp.window.forceClose !== true) {
                    e.preventDefault()
                    whatsApp.window.hide()
                }
            }))

            whatsApp.window.on('close', () => {
                if (settings.window) {
                    settings.window.close()
                    settings.window = null
                }
            })

            // Toggle contextmenu content when window is shown
            whatsApp.window.on("show", function() {
                if (whatsApp.tray != undefined) {
                    whatsApp.trayContextMenu.items[0].visible = false
                    whatsApp.trayContextMenu.items[1].visible = true

                    // Need to re-set the contextmenu for this to work under Linux
                    // TODO: Only trigger this under Linux
                    whatsApp.tray.setContextMenu(whatsApp.trayContextMenu)
                }
            })

            // Toggle contextmenu content when window is hidden
            whatsApp.window.on("hide", function() {
                if (whatsApp.tray != undefined) {
                    whatsApp.trayContextMenu.items[0].visible = true
                    whatsApp.trayContextMenu.items[1].visible = false

                    // Need to re-set the contextmenu for this to work under Linux
                    // TODO: Only trigger this under Linux
                    whatsApp.tray.setContextMenu(whatsApp.trayContextMenu)
                }
            })

            app.on('before-quit', onlyOSX(() => {
                whatsApp.window.forceClose = true
            }))

            app.on('before-quit', onlyLinux(() => {
                whatsApp.window.forceClose = true
            }))

            app.on('before-quit', onlyWin(() => {
                whatsApp.window.forceClose = true
            }))

            app.on('window-all-closed', onlyWin(() => {
                app.quit()
            }))
        }
    }

    global.settings = {
        init() {
            // if there is already one instance of the window created show that one
            if (settings.window) {
                settings.window.show()
            }
            else {
                settings.openWindow()
                settings.createMenu()
            }
        },

        createMenu() {
            settings.menu = new AppMenu()
            settings.menu.append(new MenuItem(
                {
                    label: "close",
                    visible: false,
                    accelerator: "esc",
                    click() {
                      settings.window.close()
                    }
                })
            )
            settings.menu.append(new MenuItem(
                {
                    label: 'Toggle DevTools',
                    accelerator: 'Ctrl+Shift+I',
                    visible: false,
                    click() {
                      settings.window.toggleDevTools()
                    }
                })
            )
            settings.menu.append(new MenuItem(
                {
                    label: 'Reload settings view',
                    accelerator: 'CmdOrCtrl+r',
                    visible: false,
                    click() {
                      settings.window.reload()
                    }
                })
            )
            settings.window.setMenu(settings.menu)
            settings.window.setMenuBarVisibility(false)
        },

        openWindow() {
            settings.window = new BrowserWindow(
                {
                    "width": 550,
                    "height": 550,
                    "resizable": true,
                    "center": true,
                    "frame": true,
                    "webPreferences": {
                        "nodeIntegration": true, 
                        "contextIsolation": false,
                        "enableRemoteModule": true,
                    }
                }
            )

            settings.window.loadURL("file://" + __dirname + "/html/settings.html")
            settings.window.show()

            settings.window.on("close", () => {
                settings.window = null
            })
        }
    }

    global.pkg = pkg
    global.about = {
        init() {
            // if there is already one instance of the window created show that one
            if (about.window){
                about.window.show()
            }
            else {
                about.openWindow()
                about.window.setMenu(null)
                about.window.setMenuBarVisibility(false)
            }
        },

        openWindow() {
            about.window = new BrowserWindow(
                {
                    "width": 600,
                    "height": 450,
                    "resizable": true,
                    "center": true,
                    "frame": true,
                    "webPreferences": {
                      "nodeIntegration": true,
                    }
                }
            )

            about.window.loadURL("file://" + __dirname + "/html/about.html")
            about.window.show()
            about.window.webContents.on("new-window", (e, url) => {
                electron.shell.openExternal(url)
                e.preventDefault()
            })

            about.window.on("close", () => {
                about.window = null
            })
        }
    }

    const {
      ipcMain
    } = electron
    ipcMain.on('phoneinfoupdate', (event, arg) => {
        global.phoneinfo.infos = arg
        if (arg.info != "NORMAL") {
            global.whatsApp.setWarningTray()
        }
        else {
            global.whatsApp.setNormalTray()
        }
    })
    ipcMain.on('notificationClick', (event, arg) => {
        global.whatsApp.window.show()
        global.whatsApp.window.setAlwaysOnTop(true)
        global.whatsApp.window.focus()
        global.whatsApp.window.setAlwaysOnTop(false)
    })

    global.phoneinfo = {
        init () {
            // if there is already one instance of the window created show that one
            if (phoneinfo.window) {
                phoneinfo.window.show()
            }
            else {
                phoneinfo.openWindow()
                phoneinfo.createMenu()
            }
        },

        createMenu() {
            phoneinfo.menu = new AppMenu()
            phoneinfo.menu.append(new MenuItem(
                {
                    label: "close",
                    visible: false,
                    accelerator: "esc",
                    click() {
                      phoneinfo.window.close()
                    }
                })
            )
            phoneinfo.menu.append(new MenuItem(
                {
                    label: 'Reload phoneinfo view',
                    accelerator: 'CmdOrCtrl+r',
                    visible: false,
                    click() {
                      phoneinfo.window.reload()
                    }
                })
            )
            phoneinfo.menu.append(new MenuItem({
                label: 'Toggle Developer Tools',
                accelerator: (function() {
                    if (process.platform == 'darwin')
                        return 'Alt+Command+I'
                    else
                        return 'Ctrl+Shift+I'
                })(),
                click: function(item, focusedWindow) {
                    if (focusedWindow)
                        focusedWindow.toggleDevTools()
                }
            }))
            phoneinfo.window.setMenu(phoneinfo.menu)
            phoneinfo.window.setMenuBarVisibility(false)
        },

        openWindow() {
            phoneinfo.window = new BrowserWindow(
                {
                    "width": 500,
                    "height": 500,
                    "resizable": true,
                    "center": true,
                    "frame": true,
                    "webPreferences": {
                      "nodeIntegration": true,
                    }
                }
            )

            phoneinfo.window.loadURL("file://" + __dirname + "/html/phoneinfo.html")
            phoneinfo.window.show()

            phoneinfo.window.on("close", () => {
                phoneinfo.window = null
            })
        }
    }

    app.on('ready', () => {
        whatsApp.init()
        // setting of globalShortcut
        if(config.get("globalshortcut") == true) {
            globalShortcut.register('CmdOrCtrl + Alt + W', function(){
                if(whatsApp.window.isFocused())
                    whatsApp.window.hide()
                else
                    whatsApp.window.show()
            })
        }
    })

    // unregistering the globalShorcut on quit of application
    app.on('will-quit', function(){
        if(config.get("globalshortcut") == true) {
            globalShortcut.unregisterAll()
        }
    })
})(this)
