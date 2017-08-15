if(com.tobwithu.xnotifier.p_getBoolPref("multiSession")){
  com.tobwithu.xnotifier.onLoadFF=function(){
    if(com.tobwithu.xnotifier.p_getBoolPref("keepSession")){//moved here for seamonkey 2.13.1 mac
      com.tobwithu.xnotifier.getSid=function(){
        return getBrowser().selectedTab.getAttribute("xnsid");
      };
      com.tobwithu.xnotifier.addTabListener=function(){
        var sid=com.tobwithu.xnotifier.getSid();
        if(sid!=""){
          gBrowser.tabContainer.addEventListener("TabOpen",
            function(event){
              gBrowser.tabContainer.removeEventListener("TabOpen",arguments.callee, false);
              var tab=event.target;
              tab.setAttribute("xnsid",sid);
            }
          ,false);
        }
      };
      if(typeof openLinkIn != "undefined"){//ff4 or later
        com.tobwithu.xnotifier.openLinkIn=openLinkIn;
        openLinkIn=function(url, where, params){
          var setSid=true;
          if(!com.tobwithu.xnotifier.p_getBoolPref("keepSessionForNewTab")){
            if(params&&params["fromChrome"])setSid=false;
          }
          if((where=="tab"||where=="tabshifted")&&setSid)com.tobwithu.xnotifier.addTabListener();
          com.tobwithu.xnotifier.openLinkIn(url, where, params);
        }
      }else{//ff3
        com.tobwithu.xnotifier.openNewTabWith=openNewTabWith;
        openNewTabWith=function(aURL, aDocument, aPostData, aEvent, aAllowThirdPartyFixup,aReferrer){
          com.tobwithu.xnotifier.addTabListener();
          com.tobwithu.xnotifier.openNewTabWith(aURL, aDocument, aPostData, aEvent, aAllowThirdPartyFixup,aReferrer);
        };
      }

      if(window.opener){//set sid for new window
        var tab0=window.opener.gBrowser.selectedTab;
        var sid=tab0.getAttribute("xnsid");
        if(sid!="")gBrowser.selectedTab.setAttribute("xnsid",sid);
      }
    }
    /*if(gBrowser.addTabsProgressListener)gBrowser.addTabsProgressListener({
      onStateChange:function(browser,webProgress, request, state, status){
      com.tobwithu.wmn.nsIWebMailNotifier.onStateChange(browser,webProgress, request, state, status);
      }
    });*///has fewer information
    gBrowser.tabContainer.addEventListener("TabOpen",function(event){
        var browser = gBrowser.getBrowserForTab(event.target);
        browser.addProgressListener(com.tobwithu.xnotifier.main);
    }, false);
    /* The following loop allows mail tabs opened by X-Notifier to still work properly after closing
       and restoring the browser. However, it prevents the optimization achieved in bug 1345090
       (https://bugzilla.mozilla.org/show_bug.cgi?id=1345090), so the browser takes much more time
       to restore tabs. That's why it has been commented out. */
    /*for(var i=0;i<gBrowser.tabContainer.childNodes.length;i++){
      var browser=gBrowser.getBrowserForTab(gBrowser.tabContainer.childNodes[i]);
      browser.addProgressListener(com.tobwithu.xnotifier.main);
    }*/
  }
}

com.tobwithu.xnotifier.showToolbarButton=function(){
  var id="xnotifier-toolbar-button";
  var anchor="search-container";
  try {
    var toolbar = document.getElementById("nav-bar");
    var curSet = toolbar.currentSet.split(",");
    if (curSet.indexOf(id) == -1){
      var ind = curSet.indexOf(anchor);
      var pos = ind==-1?curSet.length:ind;
      var set = curSet.slice(0, pos).concat(id).concat(curSet.slice(pos)).join(",");

      toolbar.setAttribute("currentset", set);
      toolbar.currentSet = set;
      document.persist("nav-bar", "currentset");
      try {
         BrowserToolboxCustomizeDone(true);
      }catch (e) { }
    }
  }catch(e) { }
}
com.tobwithu.xnotifier.contextMenuItem=function(){
  var b=(gContextMenu.isContentSelected || gContextMenu.onTextInput || gContextMenu.onLink ||
      gContextMenu.onImage || gContextMenu.onVideo || gContextMenu.onAudio || gContextMenu.onSocial);
  if(document.getElementById("xnotifier-bookmark"))document.getElementById("xnotifier-bookmark").hidden=b;
  if(document.getElementById("xnotifier-bookmark-sep"))document.getElementById("xnotifier-bookmark-sep").hidden=b;
}
com.tobwithu.xnotifier.initTabMenu=function(){
  if(this.p_getBoolPref("showBookmarkMenu")){
    var contextMenu = document.getElementById("contentAreaContextMenu");
    if (contextMenu){
      contextMenu.addEventListener("popupshowing",com.tobwithu.xnotifier.contextMenuItem, false);

      var m=document.getElementById("context-bookmarkpage");
      var cn=document.getElementById("context-navigation");
      if(m){
        var em=document.createElement("menuitem");
        em.setAttribute("id","xnotifier-bookmark");
        var txt=cn?m.tooltipText:m.label;
        if(!txt)txt="Bookmark";
        em.setAttribute("label",txt+" ("+this.main.getString("appName")+")");
        em.setAttribute("oncommand","com.tobwithu.xnotifier.bookmark();");
        var em2=document.createElement("menuseparator");
        em2.setAttribute("id","xnotifier-bookmark-sep");

        if(cn){//FF 32
            if(contextMenu.lastChild.tagName!="menuseparator")contextMenu.appendChild(em2);
            contextMenu.appendChild(em);

        }else{
          m.parentNode.insertBefore(em,m);
          m.parentNode.insertBefore(em2,m);
        }
      }
    }
  }
  if(!document.getElementById("xnotifier-tabMenu"))return;//ff2
  var menu=gBrowser.tabContextMenu;
  if(!menu)menu=document.getAnonymousElementByAttribute(gBrowser, "anonid", "tabContextMenu");//ff 2.0
  if(!menu)return;
  var mi = menu.childNodes;
  var n=0;
  var sep=null;
  for(var i=0;i<mi.length;i++) {
    if (mi[i].localName=="menuseparator"){
      if(n==1){sep=mi[i];break;}
      ++n;
    }
  }
  var menu2=document.getElementById("xnotifier-tabMenu").firstChild;
  menu2.addEventListener("popupshowing",com.tobwithu.xnotifier.onPopupShow,false);
  var main=com.tobwithu.xnotifier.main;
  var hdls=main.handlers;
  var tf=com.tobwithu.xnotifier.autoLoginDefaultAccount;
  var sid=gBrowser.selectedTab.getAttribute("xnsid");
  var show=false;
  for(var i=0;i<hdls.length;i++){
    var o=hdls[i];
    if(!o.enabled)continue;
    if(!tf||!main.isDefault(o.id,o.user)){
      show=true;
      var em=document.createElement("menuitem");
      em.ind=o.ind;
		  em.setAttribute("label",o.accName);
      em.setAttribute("type","checkbox");
      em.addEventListener("command",function(){com.tobwithu.xnotifier.setSessionId(this.ind);},false);
      em.setAttribute("val",o.ind.toString());
      menu2.appendChild(em);
    }
  }
  if(show){
    menu.insertBefore(document.createElement("menuseparator"),sep);
    menu.insertBefore(document.getElementById("xnotifier-tabMenu"), sep);
  }
}
com.tobwithu.xnotifier.onPopupShow=function(event){
  var tab=document.popupNode;
  var sid=tab.getAttribute("xnsid");
  if(sid=="")sid=-1;
  var list=document.getElementById("xnotifier-tabMenu").firstChild.childNodes;
  for(var i=0;i<list.length;i++){
    var val=list[i].getAttribute("val");
    if(val!=sid)list[i].removeAttribute("checked");
    else list[i].setAttribute("checked",true);
  }
}
com.tobwithu.xnotifier.setSessionId=function(sid){
  com.tobwithu.xnotifier.main.setSessionId(window,document.popupNode,sid);
}

com.tobwithu.xnotifier.bookmark=function(){
  var tabbrowser = window.getBrowser();
  var tab=tabbrowser.selectedTab;//document.popupNode;
  var browser=tabbrowser.getBrowserForTab(tab);
  var sid=tab.getAttribute("xnsid");
  if(sid==null||sid.toString()=="")sid=-1;
  var str=browser.currentURI.spec;
  if(sid!=-1){
      var o=this.main.getAccountInfo(sid);
      str="xnotifier://["+o.id+"#"+o.user+"]"+str;
  }
  var newFolderId = this.getBMfolder(this.main.getString("appName"));
  var ios = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
  var uri = ios.newURI(str, null, null);
  var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                                   .getService(Components.interfaces.nsINavBookmarksService);
  var ar = bmsvc.getBookmarkIdsForURI(uri, {});
  if(ar.length==0)bmsvc.insertBookmark(newFolderId, uri, bmsvc.DEFAULT_INDEX,browser.contentTitle);
}
com.tobwithu.xnotifier.getBMfolder=function(title){
  var historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"]
                                 .getService(Components.interfaces.nsINavHistoryService);
  var options = historyService.getNewQueryOptions();
  var query = historyService.getNewQuery();
  var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                                   .getService(Components.interfaces.nsINavBookmarksService);
  var menuFolder=bmsvc.bookmarksMenuFolder;
  query.setFolders([menuFolder], 1);
  var result = historyService.executeQuery(query, options);
  var rootNode = result.root;
  rootNode.containerOpen = true;
  for (var i = 0; i < rootNode.childCount; i ++) {
    var node = rootNode.getChild(i);
    if(node.title==title){
      rootNode.containerOpen = false;
      return node.itemId;
    }
  }
  rootNode.containerOpen = false;
  return bmsvc.createFolder(menuFolder,title, bmsvc.DEFAULT_INDEX);
}
