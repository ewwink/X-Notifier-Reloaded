function loadListener(){
  this.removeEventListener("load", loadListener, true);
  this.loadURIWithFlags(this.getAttribute("xn_url"),0,null,null,null);
  this.removeAttribute("xn_url");
}
Main.prototype.openTab = function(url,name,reuse,viewDomain,sessionId,newWin,param) {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Components.interfaces.nsIWindowMediator);
  var win = wm.getMostRecentWindow("navigator:browser");
  if(win==null){
    win=this.getWindow(true);
    var pref = Components.classes["@mozilla.org/preferences-service;1"]
                  .getService(Ci.nsIPrefService)
                  .getBranch("");
    if(pref.getIntPref("browser.startup.page")==3){
      var self=this;
      /*win.gBrowser.addEventListener("SSTabRestored", function(aEvent) { //not work in ff4
        win.gBrowser.removeEventListener("SSTabRestored",this,false);
        self._openTab(url,name,reuse,viewDomain,sessionId,newWin);
      },false);*/
      var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      var tmp={
        notify:function(aTimer){
          self._openTab(url,name,reuse,viewDomain,sessionId,newWin,param);
        }
      };
      timer.initWithCallback(tmp,300,Ci.nsITimer.TYPE_ONE_SHOT);
      return;
    }
  }
  this._openTab(url,name,reuse,viewDomain,sessionId,newWin,param);
}
Main.prototype._openTab =function(url,name,reuse,viewDomain,sessionId,newWin,param){
  function calcSid(sid){
    if(sid==null||sid.toString()=="")return -1;
    else return sid;
  }
  if(param){
    var post=Components.classes['@mozilla.org/io/string-input-stream;1']
                   .createInstance(Ci.nsIStringInputStream);
    var content = 'Content-Type: application/x-www-form-urlencoded\n'+
              'Content-Length: '+param.length+'\n\n'+param;
    post.setData(content, content.length);
    param=post;
  }
  if(reuse){
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
              .getService(Components.interfaces.nsIWindowMediator);
    var enm = wm.getEnumerator("navigator:browser");
    while(enm.hasMoreElements()){
      var win=enm.getNext();
      var tabbrowser = win.getBrowser();
      for (var i = 0;i< tabbrowser.tabContainer.childNodes.length;i++){
        var tab = tabbrowser.tabContainer.childNodes[i];
        if (tab.hasAttribute("xntab")&&tab.getAttribute("xntab")==name) {
          var browser=tabbrowser.getBrowserForTab(tab);
          if(this.canReuse(browser.currentURI,viewDomain)&&(!this.multiSession||calcSid(tab.getAttribute("xnsid"))==calcSid(sessionId))){
            if(this.prefBranch.getBoolPref("reloadTab")||(!this.multiSession&&tab.getAttribute("xnid")!=sessionId)||!viewDomain){
              if(this.multiSession)this.setSessionId(win,tab,sessionId);
              else if(sessionId!=null)tab.setAttribute("xnid",sessionId);
              if(!this.multiSession&&name=="gmail"){
                browser.setAttribute("xn_url",url);
                browser.addEventListener("load", loadListener, true);
                browser.loadURIWithFlags("about:blank",0,null,null,null);
              }else browser.loadURIWithFlags(url,0,null,null,param);
            }
            if(!this.prefBranch.getBoolPref("loadInBackground")){
              tabbrowser.selectedTab = tab;
              tabbrowser.contentWindow.focus();
            }
            return;
          }else{
            tab.removeAttribute("xntab");
            if(!this.multiSession)tab.removeAttribute("xnid");
          }
        }
      }
    }
  }
  //not found
  var win=this.getWindow(true);
  if(newWin){
    win.open("about:blank");
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                        .getService(Components.interfaces.nsIWindowMediator);
    win = wm.getMostRecentWindow("navigator:browser");
  }
  var tabbrowser=win.getBrowser();
  var tab = tabbrowser.selectedTab;
    if(tabbrowser.currentURI.spec!="about:blank"||
        tab.hasAttribute("xntab")){
    tab=tabbrowser.addTab("about:blank");
    }
  if(name!=null)tab.setAttribute("xntab",name);
  var browser=tabbrowser.getBrowserForTab(tab);
  if(this.multiSession)this.setSessionId(win,tab,sessionId);
  else if(sessionId!=null)tab.setAttribute("xnid",sessionId);
  browser.loadURIWithFlags(url,0,null,null,param);
  if(!this.prefBranch.getBoolPref("loadInBackground")){
    tabbrowser.selectedTab = tab;
    win.focus();
  }
}
Main.prototype.setSessionId = function(win,tab,sid){
  if(sid==null||sid.toString()=="")sid=-1;
  if(sid==-1){
    var tabbrowser=win.getBrowser();
    var browser=tabbrowser.getBrowserForTab(tab);
    var doc=browser.contentDocument;
    try{
      if(doc.com&&doc.com.tobwithu&&doc.com.tobwithu.xnotifier){
        if(Object.defineProperty){
          Object.defineProperty(doc, 'cookie', {});
        }
      }
    }catch(e){
dout("***"+e);
    }
  }
  tab.setAttribute("xnsid",sid);
}
Main.prototype.openNewWindow = function() {
    var win=Components.classes["@mozilla.org/appshell/appShellService;1"]
                    .getService(Components.interfaces.nsIAppShellService).hiddenDOMWindow;
    win.open("about:blank");
}
Main.prototype.openWindow = function(url,name,reuse,viewDomain,sid,param) {
  this.openTab(url,name,reuse,viewDomain,sid,true,param);
}
Main.prototype.getWindow = function(notChrome) {
 /* var win=Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
              .getService(Components.interfaces.nsIWindowWatcher).activeWindow;
  if(win==null){*/
  var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                      .getService(Components.interfaces.nsIWindowMediator);
  var win = wm.getMostRecentWindow("navigator:browser");
  if(win==null){
    win=Components.classes["@mozilla.org/appshell/appShellService;1"]
                    .getService(Components.interfaces.nsIAppShellService).hiddenDOMWindow;
    if(notChrome){
      win.open("about:blank");
      win = wm.getMostRecentWindow("navigator:browser");
    }
  }
  return win;
}
Main.prototype.openLink = function(url) {
  var  win=Components.classes["@mozilla.org/appshell/appShellService;1"]
                    .getService(Components.interfaces.nsIAppShellService).hiddenDOMWindow;
  win.open(url);
}
Main.prototype.openInTab = function(url){
  var win=this.getWindow(true);
  var browser=win.getBrowser();
  var tab=browser.addTab(url);
  browser.selectedTab = tab;
}
