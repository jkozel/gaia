Evme.Apps = new function Evme_Apps() {
    var NAME = "Apps", self = this,
        el = null, elList = null,
        appsArray = {}, appsDataArray = [], numberOfApps = 0,
        scroll = null, defaultIconToUse = 0,
        reportedScrollMove = false, shouldFadeBG = false,
        isSwiping = false,
        
        fadeBy = 0, showingFullScreen = false,
        timeoutAppsToDrawLater = null,
        
        APP_HEIGHT = "FROM CONFIG",
        DEFAULT_SCREEN_WIDTH = "FROM CONFIG",
        SCROLL_TO_BOTTOM = "CALCULATED",
        MAX_SCROLL_FADE = 200,
        FULLSCREEN_THRESHOLD = 0.8,
        MAX_APPS_CLASSES = 150,
        APPS_PER_ROW = 4,
        ICONS_STYLE_ID = "apps-icons",
        MIN_HEIGHT_FOR_MORE_BUTTON = "FROM CONFIG",
        DEFAULT_ICON_URL = "FROM CONFIG",
        TIMEOUT_BEFORE_REPORTING_APP_HOLD = 800,
        ftr = {};
        

    this.init = function init(options) {
        !options && (options = {});
        
        for (var k in options.features) { ftr[k] = options.features[k] }
        
        APP_HEIGHT = options.appHeight;
        MIN_HEIGHT_FOR_MORE_BUTTON = options.minHeightForMoreButton;
        DEFAULT_SCREEN_WIDTH = options.defaultScreenWidth;
        
        el = options.el;
        elList = Evme.$('ul', el)[0];
        
        self.More.init();
        
        DEFAULT_ICON_URL = options.design.defaultIconUrl[Evme.Utils.ICONS_FORMATS.Large];
        if (typeof DEFAULT_ICON_URL == "string") {
            DEFAULT_ICON_URL = [DEFAULT_ICON_URL];
        }
        
        elList.addEventListener("touchend", function onTouchEnd(){
            self.timeoutHold && window.clearTimeout(self.timeoutHold);
        });
        
        var hasFixedPositioning = Evme.Utils.hasFixedPositioning();
        
        if (hasFixedPositioning){
            var headerHeight = options.elHeader.offsetHeight;            
            options.elHeader.style.cssText += 'position: fixed; top: 0; left: 0; width: 100%; zIndex: 100;';
            el.style.cssText += 'top: 0; padding-top: ' + headerHeight + 'px;';
        } 
       
        scroll = new Scroll(el, {
            "hScroll": false,
            "checkDOMChanges": false,
            "onScrollStart": scrollStart,
            "onScrollMove": scrollMove,
            "onTouchEnd": scrollEnd
        }, hasFixedPositioning);
        
        self.calcAppsPositions();
        
        Evme.EventHandler.trigger(NAME, "init");
    };
    
    this.isSwiping = function _isSwiping() {
        return isSwiping;
    };
    
    this.getAppTapAndHoldTime = function getAppTapAndHoldTime() {
        return TIMEOUT_BEFORE_REPORTING_APP_HOLD;
    };
    
    this.load = function load(options) {
        var apps = options.apps,
            offset = options.offset,
            iconsFormat = options.iconsFormat,
            onDone = options.onDone,
            isMore = offset > 0,
            hasMore = options.hasMore;
        
        if (options.clear) {
            self.clear();
        }
        
        var missingIcons = drawApps(apps, isMore, iconsFormat, function onAppsDrawn(){
            if (options.installed && apps.length > 0) {
                self.addInstalledSeparator();
            }
            
            if (onDone instanceof Function) {
                onDone();
            }
        });
        
        if (options.clear) {
            self.scrollToStart();
        }
        
        cbLoadComplete(apps, missingIcons);
        
        return missingIcons;
    };
    
    this.updateApps = function updateApps(options) {
        updateApps(options.apps, options.iconsFormat);
        
        return null;
    };

    this.clear = function clear() {
        if (appsDataArray.length === 0) {
            return false;
        }
        
        window.clearTimeout(timeoutAppsToDrawLater);
        for (var id in appsArray) {
            appsArray[id].remove();
        }
        appsArray = {};
        appsDataArray = [];
        defaultIconToUse = 0;
        numberOfApps = 0;
        
        elList.innerHTML = "";
        self.hasInstalled(false);
        self.More.hide();
        self.scrollToStart();
        
        return true;
    };
    
    this.refreshScroll = function refreshScroll() {
        SCROLL_TO_BOTTOM = el.offsetHeight - elList.offsetHeight;
        
        scroll.refresh();
    };
    
    this.scrollToStart = function scrollToStart() {
        scroll.scrollTo(0, 0);
    };
    
    this.hasInstalled = function hasInstalled(isTrue) {
        if (typeof isTrue !== 'boolean') {
            return el.classList.contains("has-installed");
        }
        
        if (isTrue) {
            el.classList.add("has-installed");
        } else {
            el.classList.remove("has-installed");
        }
        
        return isTrue;
    };
    
    this.addInstalledSeparator = function addInstalledSeparator() {
        elList.appendChild(Evme.$create('li', {'class': "installed-separator"}));
    };
    
    this.disableScroll = function disableScroll() {
        scroll.disable();
    };    
    this.enableScroll = function enableScroll() {
        scroll.enable();
    };
    
    this.setAppsClasses = function setAppsClasses(iFrom, bAnimate) {
        (!iFrom || !bAnimate) && (iFrom = 0);
        
        var elApps = elList.childNodes,
            index = 0;
        
        for (var i=iFrom, elApp=elApps[i]; elApp; elApp=elApps[++i]) {
            if (bAnimate) {
                elApp.style.cssText += "; -moz-transition-duration: " + (200-((iFrom-i)*20)) + 'ms';
            }
            
            var cls = elApp.className;
            if (elApp.id.indexOf("app_") !== -1) {
                cls = cls.replace(/pos\d+/g, "");
                elApp.className = cls + " pos" + index;
                index++;
            }
        }
    };
    
    this.getAppsSignature = function getAppsSignature(_apps) {
        !_apps && (_apps = appsDataArray);
        var key = "";
        for (var i=0; i<_apps.length; i++) {
            key += _apps[i].id + ",";
        }
        return key;
    };
    
    this.getElement = function getElement() {
        return el;
    };
    
    this.getList = function getList() {
        return elList;
    };

    this.getScrollPosition = function getScrollPosition() {
        return scroll.y;
    };
    
    this.getDefaultIcon = function getDefaultIcon() {
        var defaultIcon = DEFAULT_ICON_URL[defaultIconToUse];
        
        defaultIconToUse++;
        if (defaultIconToUse >= DEFAULT_ICON_URL.length) {
            defaultIconToUse = DEFAULT_ICON_URL.length-1;
        }
        
        return defaultIcon;
    };
    
    this.removeApp = function removeApp(id) {
        if (appsArray[id]) {
            var index = getAppIndex(appsArray[id].getElement());
            
            appsArray[id].remove();
            delete appsArray[id];
            
            self.setAppsClasses(index, true);
        }
    };
    
    this.calcAppsPositions = function calcAppsPositions() {
        var rules = "#" + el.id + " ul li { width: " + 100/APPS_PER_ROW + "%; }\n",
            elStyle = Evme.$create('style', {'type': "text/css"}, rules);
        
        Evme.Utils.getContainer().appendChild(elStyle);
        
        self.refreshScroll();
    };
    
    this.hasSpaceForMoreButton = function hasSpaceForMoreButton(height){
        return height >= MIN_HEIGHT_FOR_MORE_BUTTON;
    };
    
    this.getAppsPerRow = function getAppsPerRow() {
        return APPS_PER_ROW;
    };
    
    this.getCurrentRowsCols = function getCurrentRowsCols(){
        var totalCols = numberOfApps < APPS_PER_ROW ? numberOfApps : APPS_PER_ROW;
        var totalRows = Math.ceil(numberOfApps/APPS_PER_ROW);
        return [totalCols, totalRows];
    };
    
    this.getApp = function getApp(id) {
        return appsArray[id] || null;
    };
    
    this.getApps = function getApps() {
        return appsArray;
    };
    
    this.hasApps = function hasApps() {
        return appsDataArray.length > 0;
    };
    
    this.getAppsAsArray = function getAppsAsArray() {
        return appsDataArray;
    };
    
    function getAppIndex(elApp) {
        var elApps = elList.childNodes;
        for (var i=0,el=elApps[i]; el; el=elApps[++i]) {
            if (el[i] === elApp) {
                return i;
            }
        }
        
        return 0;
    }
    
    function scrollStart(e) {
        shouldFadeBG = (scroll.y === 0 && numberOfApps > 0);
        fadeBy = 0;
        reportedScrollMove = false;
    }
    
    function scrollMove(e) {
        var y = scroll.y;
        
        if (!reportedScrollMove && y == SCROLL_TO_BOTTOM) {
            reportedScrollMove = true;
            cbScrolledToEnd();
        } else if (shouldFadeBG) {
            var _fadeBy = scroll.distY/MAX_SCROLL_FADE;
            
            if (_fadeBy < fadeBy) {
                _fadeBy = 0;
                shouldFadeBG = false;
            }
            
            fadeBy = _fadeBy;
            Evme.BackgroundImage.fadeFullScreen(fadeBy);
        } else {
            Evme.BackgroundImage.fadeFullScreen(0);
        }
    }
    
    function scrollEnd(data) {
        if (shouldFadeBG && scroll.distY >= FULLSCREEN_THRESHOLD*MAX_SCROLL_FADE) {
            showingFullScreen = true;
            cbScrolledToTop();
            window.setTimeout(function onTimeout(){
                showingFullScreen = false;
            }, 1000);
        } else {
            !showingFullScreen && Evme.BackgroundImage.cancelFullScreenFade();
        }
    }
    
    function drawApps(apps, isMore, iconsFormat, cb) {
        var numOfApps = 0; for (var i in appsArray){ numOfApps++; }
        
        numberOfApps += apps.length;
        for (var i=0; i<apps.length; i++) {
            appsDataArray.push(apps[i]);
        }
        
        var iconsResult = Evme.Utils.Apps.print({
            "obj": self,
            "apps": apps,
            "numAppsOffset": numOfApps,
            "isMore": isMore,
            "iconsFormat": iconsFormat,
            "elList": elList,
            "onDone": function onDone(appsList) {
                self.setAppsClasses();
                
                self.refreshScroll();
                
                for (var i=0; i<appsList.length; i++) {
                    appsArray[appsList[i].getId()] = appsList[i];
                }
                
                cb && cb();
            }
        });
        
        return iconsResult;
    }
    
    function updateApps(apps, iconsFormat) {
        window.clearTimeout(timeoutAppsToDrawLater);
        
        for (var i=0; i<apps.length; i++) {
            var appData = apps[i],
                app = appsArray[appData.id];
                
            if (app) {
                appData.icon = Evme.IconManager.parse(appData.id, appData.icon, iconsFormat);
                
                app.update(appData);
            }
        }   
        
        return true;
    }
    
    this.updateIcons = function updateIcons(apps, iconsFormat) {
        var iconsResult = {
            "cached": [],
            "missing": []
        };
        
        for (var i=0; i<apps.length; i++) {
            var _app = apps[i];
            var id = _app.id;
            if (appsArray[id]) {
                _app.icon = Evme.IconManager.parse(id, _app.icon, iconsFormat);
                appsArray[id].update(_app);

                if (appsArray[id].missingIcon()) {
                    iconsResult["missing"].push(_app.icon);
                } else {
                    iconsResult["cached"].push(_app.icon);
                }
            }
        }

        return iconsResult;
    };
    
    function cbScrolledToTop() {
        Evme.EventHandler.trigger(NAME, "scrollTop");
    }
    
    function cbScrolledToEnd() {
        Evme.EventHandler.trigger(NAME, "scrollBottom");
    }
    
    function cbLoadComplete(data, missingIcons) {
        Evme.EventHandler.trigger(NAME, "loadComplete", {
            "data": data,
            "icons": missingIcons
        });
    }

    this.More = new function More() {
        var NAME = "AppsMore", self = this,
            el = null,
            
            ID = "more-apps";

        this.init = function init(options) {
            options = options || {};
            
            id = options.id;
        };
        
        this.show = function show() {
            if (!el) {
                visible = true;
                
                el = Evme.$create('li',
                        {'id': ID},
                        '<progress class="small skin-dark"></progress>' +
                        '<b ' + Evme.Utils.l10nAttr(NAME, 'loading') + '></b>');
                
                Evme.Apps.getList().appendChild(el);
                
                Evme.EventHandler.trigger(NAME, "show");
            }
        };

        this.hide = function hide() {
            if (el) {
                Evme.$remove(el);
                el = null;
                
                Evme.EventHandler.trigger(NAME, "hide");
            }
        };
    };
}

Evme.IconManager = new function Evme_IconManager() {
    var NAME = "IconManager", self = this,
        _prefix = "_icon", CACHE_VERSION = "2.6";
    
    this.clear = function clear() {
        var numIcons = 0;
        var icons = Evme.Storage.get();
        for (var k in icons) {
            if (k.indexOf(_prefix) == 0) {
                numIcons++;
                Evme.Storage.remove(k);
            }
        }
        return numIcons;
    };
    
    this.validateCacheVersion = function validateCacheVersion() {
        var currentVersion = Evme.Storage.get("iconsVersion");
        if (!currentVersion || currentVersion != CACHE_VERSION) {
            self.clear();
            Evme.Storage.add("iconsVersion", CACHE_VERSION);
        }
    };
    
    this.parse = function parse(id, icon, iconsFormat) {
        if (icon == null) {
            // If icon from API is empty- it means it's in the user's cache
            return self.get(id);
        } else {
            // Else add the icon to the user's cache and return it
            return self.add(id, icon, iconsFormat);
        }
    };

    this.add = function add(id, icon, iconsFormat) {
        icon.format = iconsFormat;
        icon.id = id;
        
        if (!icon.format || !icon.revision || !icon.id) {
            return icon;
        }
        
        var iconInCache = self.get(id);
        
        if (!iconInCache || iconInCache.format < iconsFormat) {
            var sIcon = "";
            try {
                sIcon = JSON.stringify(icon);
                Evme.Storage.add(_prefix + id, sIcon);
            } catch(ex) {
                
            }
            
            return icon;
        }
        
        return iconInCache;
    };

    this.get = function get(id) {
        if (id) {
            var icon = Evme.Storage.get(_prefix+id) || null;
            
            if (!icon) {
                return null;
            }
            
            // Icon in cache isn't a valid object (truncated or somthing perhaps?)
            try {
                icon = JSON.parse(icon);
            } catch(ex) {
                Evme.Storage.remove(_prefix+id);
                return null;
            }
            
            // Icon doesn't contain all the info (maybe it's from a previous version and failed removal)
            if (!icon.id || !icon.revision || !icon.format) {
                return null;
            }
            
            return icon;
        } else {
            var _icons = {};
            var icons = Evme.Storage.get();
            
            for (var k in icons) {
                if (k.indexOf(_prefix) == 0) {
                    _icons[k] = self.get(k.replace(_prefix, ""));
                }
            }
            
            return _icons;
        }
    };
};

Evme.IconGroup = new function Evme_IconGroup() {
    this.get = function get(ids, callback) {
        var iconIcons = Evme.Utils.getIconGroup(),
            needToLoad = iconIcons.length,
            useShadows = true;
            
        var el = document.createElement("div");
            el.className = "apps-group";
        
        var html = '';
        for (var i=0; i<iconIcons.length; i++) {
            var app = ids[ids.length-1-i],
                icon = iconIcons[i],
                y = icon.y,
                x = icon.x,
                size = icon.size;
                
            if (typeof app != "object") {
                app = {
                    "id": app,
                };
            }
            
            if (!app.icon) {
                app.icon = Evme.IconManager.get(app.id);
            }
            
            app.icon = Evme.Utils.formatImageData(app.icon);
            
            var missingIcon = '';
            if (!app.icon) {
                missingIcon = 'iconToGet="' + app.id + '"';
            }
            
            html += '<span ' + missingIcon + ' style="' +
                        ' top: ' + y + 'px;' +
                        ' left: ' + x + 'px;' +
                        ' border-radius: ' + size/2 + 'px;' +
                        (app.icon? ' background-image: url(' + app.icon + ');' : '') +
                        ' width: ' + size + 'px;' +
                        ' height: ' + size + 'px;' +
                        (icon.rotate ? ' ' + Evme.Utils.cssPrefix() + 'transform: rotate(' + icon.rotate + 'deg);' : '') +
                        (((icon.shadowOffset || icon.shadowBlur) && useShadows)? ' box-shadow: ' + (icon.shadowOffsetX || "0") + 'px ' + (icon.shadowOffset || "0") + 'px ' + (icon.shadowBlur || "0") + 'px 0 rgba(0, 0, 0, ' + icon.shadowOpacity + ');' : '') +
                        '"></span>';
        }
        
        el.innerHTML = html;
        
        return el;
    };
};

Evme.App = function Evme_App(__cfg, __index, __isMore, parent) {
    var NAME = "App", self = this,
        cfg = {}, el = null, index = __index, isMore = __isMore, hadID = true,
        timeTouchStart = 0, touchStartPos = null, firedHold = false, tapIgnored = false,
        DISTANCE_TO_IGNORE_AS_MOVE = 3;
        
    this.init = function init(_cfg) {
        cfg = normalize(_cfg);
        
        // generate id if there was none
        if (!cfg.id) {
            hadID = false;
            cfg.id = Math.round(Math.random()*1221221) + 1;
        }
        
        // fill in default icon
        // if there's no icon and it's a bing result / official website app
        if (!cfg.icon && (!hadID || cfg.preferences.defaultIcon)){
            cfg.icon = Evme.Apps.getDefaultIcon();
        }
        
    };
    
    this.isExternal = function isExternal() {
        return cfg.isWeblink;
    };
    
    this.draw = function draw(_cfg) {
        if (_cfg) {
            self.init(_cfg);
        }

        self.remove();
        
        el = Evme.$create('li', {'class': "new", 'id': "app_" + cfg.id});
        self.update();
        
        if (cfg.installed) {
            el.classList.add("installed");
        }
        
        if ("ontouchstart" in window) {
            el.addEventListener("touchstart", touchstart);
            el.addEventListener("touchmove", touchmove);
            el.addEventListener("touchend", touchend);
        } else {
            el.addEventListener("click", function onClick(e) {
                firedHold = tapIgnored = false;
                touchend(e);
            });
        }
       
        return el;
    };

    this.getHtml = function getHtml() {
        var icon = Evme.Utils.formatImageData(cfg.icon) || Evme.Apps.getDefaultIcon();

        return  '<div class="c" href="' + cfg.appUrl + '">' +
                    '<span class="thumb" style="background-image: url(\'' + icon + '\');"></span>' + 
                    '<b>' + cfg.name + '</b>' +
                '</div>';
    };

    this.getCurrentHtml = function getCurrentHTML() {
        return el.innerHTML;
    };
    
    this.goTo = function goTo() {
        cbClick();
    };
    
    this.close = function close() {
        el.classList.add("new");
        
        window.setTimeout(function onTimeout(){
            self.remove();
        }, 200);
        
        Evme.EventHandler.trigger(NAME, "close", {
            "app": self,
            "el": el,
            "data": cfg,
            "index": index
        });
    };

    this.update = function update(_cfg) {
        if (_cfg) {
            self.init(_cfg);
        }
        if (el) {
            el.innerHTML = self.getHtml();

            Evme.Utils.blobToDataURI(cfg.icon, function(result) {
                var iconEl = el.querySelector(".thumb");
                iconEl.style.backgroundImage = 'url(\''+result+'\')';
            });
        }
    };

    this.getElement = function getElement() {
        return el;
    };
    
    this.getId = function getId() {
        return cfg.id;
    };
    
    this.getLink = function getLink() {
        return cfg.appUrl;
    };
    
    this.getFavLink = function getFavLink() {
        return cfg.favUrl != "@" && cfg.favUrl || cfg.appUrl;
    };
    
    this.getPref = function getPref() {
        return cfg.preferences || "{}";
    };

    this.remove = function remove() {
        Evme.$remove(el);
    };

    this.missingIcon = function missingIcon() {
        return (!cfg.icon || cfg.icon.data == "1");
    };

    this.getIcon = function getIcon() {
        return cfg.icon;
    };
    
    this.getCfg = function getCfg() {
        return cfg;
    };
    
    this.setIcon = function setIcon(icon, bRedraw) {
        cfg.icon = icon;
        
        if (bRedraw && el) {
            var iconUrl = Evme.Utils.formatImageData(cfg.icon) || Evme.Apps.getDefaultIcon();
            
            Evme.$('.c', el, function onItem(el){
                var elIcon = Evme.$create('span', {'class': 'thumb'});
                elIcon.style.backgroundImage = 'url(' + iconUrl + ')';
                
                el.append(elIcon);
            });
            
            window.setTimeout(function onTimeout() {
                if (!el) {
                    return;
                }
                
                var elThumbs = Evme.$(".thumb", el);
                if (elThumbs.length > 1) {
                    Evme.$remove(elThumbs[0]);
                }
            }, 100);
        }
    };
    
    this.getLink = function getLink() {
        return cfg.appUrl;
    };
    
    function touchstart(e) {
        firedHold = tapIgnored = false;
        timeTouchStart = new Date().getTime();
        parent.timeoutHold = window.setTimeout(cbHold, Evme.Apps.getAppTapAndHoldTime());
        touchStartPos = getEventPoint(e);
    }
    
    function touchmove(e) {
        if (!touchStartPos) { return; }
        
        var point = getEventPoint(e),
            distance = [point[0] - touchStartPos[0], point[1] - touchStartPos[1]];
            
        if (Math.abs(distance[0]) > DISTANCE_TO_IGNORE_AS_MOVE ||
            Math.abs(distance[1]) > DISTANCE_TO_IGNORE_AS_MOVE) 
        {
            window.clearTimeout(parent.timeoutHold);
            tapIgnored = true;    
        }
    }
    
    function touchend(e) {
        if (firedHold || tapIgnored) {
            return;
        }
        
        window.clearTimeout(parent.timeoutHold);
        e.preventDefault();
        e.stopPropagation();
        
        cbClick(e);
    }
            
    function getEventPoint(e) {
        var touch = e.touches && e.touches[0] ? e.touches[0] : e,
            point = touch && [touch.pageX || touch.clientX, touch.pageY || touch.clientY];
        
        return point;
    }
    
    function normalize(cfg){
        var p = "preferences";
        if (cfg[p] && typeof cfg[p] === "string"){
            try{
                cfg[p] = JSON.parse(cfg[p]);    
            } catch(ex) {}
        }
        !cfg[p] && (cfg[p] = {});
        
        return cfg;
    }

    function cbClick(e) {
        Evme.EventHandler.trigger(NAME, "click", {
            "app": self,
            "appId": hadID ? cfg.id : 0,
            "el": el,
            "data": cfg,
            "index": index,
            "isMore": isMore,
            "e": e
        });
    }

    function cbHold() {
        firedHold = true;
        
        Evme.EventHandler.trigger(NAME, "hold", {
            "app": self,
            "appId": hadID ? cfg.id : 0,
            "el": el,
            "data": cfg,
            "index": index,
            "isMore": isMore
        });
    }
    
    self.init(__cfg);
}
