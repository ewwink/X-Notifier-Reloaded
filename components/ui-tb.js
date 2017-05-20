Main.prototype.openTab = function(url,name,reuse,viewDomain) {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
             .getService(Components.interfaces.nsIWindowMediator);

  if(reuse){
    var enm = wm.getEnumerator("mail:3pane");
    while(enm.hasMoreElements()){
      var win=enm.getNext();
      var tabmail = win.document.getElementById("tabmail");  
      for (var i = 0;i< tabmail.tabContainer.childNodes.length;i++){
        var tab = tabmail.tabContainer.childNodes[i];
        if (tab.hasAttribute("xntab")&&tab.getAttribute("xntab")==name) {
          var tabbrowser=tabmail.tabInfo[i].browser;
          if(this.canReuse(tabbrowser.currentURI,viewDomain)){
            tabbrowser.loadURIWithFlags(url);
            tabmail.tabContainer.selectedItem = tab;
            win.focus();            
            return;
          }else{
            tab.removeAttribute("xntab");
          }
        }
      }
    }
  }
  var win=wm.getMostRecentWindow("mail:3pane");
  if(win){
    var tabmail = win.document.getElementById("tabmail");
    var t=tabmail.openTab("contentTab", {contentPage: url,clickHandler: "specialTabs.siteClickHandler(event,/.*/);"});
    if(t){
      var tab=t.tabNode;
      tab.setAttribute("xntab",name);
      win.focus();
    }
    return;
  }
  //not found
  var win=this.getWindow().openDialog("chrome://messenger/content/", "_blank",  
                      "chrome,dialog=no,all", null,  
                      { tabType: "contentTab",  
                        tabParams: {contentPage: url,clickHandler: "specialTabs.siteClickHandler(event,/.*/);"} }); 
  win.focus();
}
Main.prototype.openNewWindow = function() {
  this.getWindow(true);
}
Main.prototype.openWindow = function(url,name,reuse,viewDomain) {
  if(!this.messenger){
  this.messenger = Components.classes["@mozilla.org/messenger;1"]
                        .createInstance(Components.interfaces.nsIMessenger);
  }
  this.messenger.launchExternalURL(url);
}
Main.prototype.getWindow = function(notChrome) {
  var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                      .getService(Components.interfaces.nsIWindowMediator);
  var win = wm.getMostRecentWindow("mail:3pane");
  if(win==null){
    win=Components.classes["@mozilla.org/appshell/appShellService;1"]
                    .getService(Components.interfaces.nsIAppShellService).hiddenDOMWindow;
    if(notChrome){
      win=win.openDialog("chrome://messenger/content/", "_blank",  
                      "chrome,dialog=no,all", null, null);     
    }      
  }
  return  win;
}
Main.prototype.openLink = function(url) {
  var messenger = Components.classes["@mozilla.org/messenger;1"]
                        .createInstance(Components.interfaces.nsIMessenger);
  messenger.launchExternalURL(url);
}
Main.prototype.openInTab = function(url){
  this.openTab(url,null,false,null);
}