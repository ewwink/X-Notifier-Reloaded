/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is X-notifier.
 *
 * The Initial Developer of the Original Code is
 * Byungwook Kang.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


if(!com) var com={};
if(!com.tobwithu) com.tobwithu={};
com.tobwithu.xnotifier = {
  dout:Components.utils.reportError,

  info:[],
  onClick: function(aEvent) {
    if (aEvent &&(aEvent.button == 2||(aEvent.button ==0&&aEvent.ctrlKey)))
      return;
    if(aEvent &&((aEvent.button == 0&&aEvent.shiftKey)||aEvent.button == 1)){
      this.onCheckNow();
      return;
    }
    if(!this.p_getBoolPref("autoHideNotification"))this.closeWindow("alert:alert","xn_alert");
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);
    var branch = prefService.getBranch("extensions.xnotifier.");
    var n=branch.getIntPref("iconLeftClick");
    if(n==1){
      this.onCheckNow();
      return;
    }
    var elm=document.getElementById("xnotifier-statusbar");
    var openAll=aEvent && (aEvent.button == 0&&(aEvent.altKey||aEvent.metaKey));
    if(!openAll&&elm.getAttribute("newMsg")!="true"&&this.info.length>0){
    //if(this.info.length==1){
      this.main.openView(this.info[0].ind,null);
      return;
    }
    this.main.openViews(openAll);
  },
  onCheckNow: function() {
    this.main.checkAll(false);
  },
  onEnabled: function() {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);
    var branch = prefService.getBranch("extensions.xnotifier.");
    branch.setBoolPref("enabled",!branch.getBoolPref("enabled"));
  },
  onContextMenu: function() {
    document.getElementById("xnotifier-window").collapsed=!this.p_getBoolPref("menuWindow");
    var em=document.getElementById("xnotifier-sidebar");
    if(em)em.collapsed=!this.main.isFF||!this.p_getBoolPref("menuSidebar");
    document.getElementById("xnotifier-log").collapsed=!com.tobwithu.xnotifier.main.debug;
  },
  onOpenXN: function() {
    this.main.openXN();
  },
  onHelp: function(event) {
    if(event&&event.shiftKey){
      this.main.toggleDebug();
      return;
    }
    this.main.openInTab("http://xnotifier.tobwithu.com/dp/forum/3");
  },
  onPreferences: function() {
    this.main.openOptions();
  },

  p_getBoolPref: function(name){
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);
    var branch = prefService.getBranch("extensions.xnotifier.");
    return branch.getBoolPref(name);
  },
  openView: function(ind,aEvent,folder) {
    if (aEvent.button == 2||(aEvent.button ==0&&aEvent.ctrlKey))
      return;
    if((aEvent.button == 0&&aEvent.shiftKey)||aEvent.button == 1){
      this.main.check(ind);
    }else this.main.openView(ind,folder,aEvent.button == 0&&(aEvent.altKey||aEvent.metaKey));
  },
  setEnabled: function(enabled){
    var elm=document.getElementById("xnotifier-statusbar");
    if(elm){
      elm.setAttribute("enabled", enabled);
    }
    elm=document.getElementById("xnotifier-toolbar-button");
    if(elm){
      elm.setAttribute("enabled",enabled);
    }
    document.getElementById("xnotifier-context-menu-enabled").setAttribute("checked",enabled);
  },
  /***********************************************************
  Listener implementation
  ***********************************************************/
  onStateChange: function(aIndex,aCount,aData){
    if(aIndex==this.main.MSG_INIT){
      if(this.main.multiSession&&this.initTabMenu
        &&this.p_getBoolPref("showTabMenu"))this.initTabMenu();
      this.setEnabled(aCount==1);
      this.initCount();
    }else if(aIndex==this.main.MSG_ENABLED){
      this.setEnabled(aCount==1);
      return;
    }else if(aIndex==this.main.MSG_SHOWICON){
      var elm=document.getElementById("xnotifier-statusbar");
      if(elm)elm.collapsed=aCount==0;
      return;
    }else if(aIndex==this.main.MSG_SHOWTBBTN){
      this.showToolbarButton();
      return;
    }else if(aIndex==this.main.MSG_RESET){//accounts change
      this.initCount();
    }else if(aIndex==this.main.MSG_SET_ANI){
      elm=document.getElementById("xnotifier-toolbar-button");
      if(elm)elm.setAttribute("ani",aCount?aCount:"");
      return;
    }else if(aIndex==this.main.MSG_CHECK_START){
      var mi=document.getElementById("xnotifier-mi"+aCount);
      if(mi)mi.setAttribute("image","chrome://xnotifier/skin/loading.png");
      var obj=this.main.getAccountInfo(aCount);
      var ti=document.getElementById(this.getToolbarItemId(obj));
      if(ti)ti.setAttribute("image","chrome://xnotifier/skin/loading.png");
      return;
    }else{
      var obj=this.main.getAccountInfo(aIndex);
      for(var i=0;i<this.info.length;i++){
        var o=this.info[i];
        if(o.id==obj.id&&o.user==obj.user){
          o.count=aCount;
          o.data=aData;
          var menu=document.getElementById("xnotifier-mi"+o.ind);
          if(menu){
            menu.setAttribute("image",this.main.getIconURL(o.id,o.user));
            menu.setAttribute("style","font-weight:"+(aCount>0?"bold":"normal")+(aCount<0?";color:GrayText":""));
            if(aCount>=0){
              menu.setAttribute("class","menuitem-iconic bookmark-item menuitem-with-favicon");
              if(this.p_getBoolPref("menuShowData")){
                if(aData.desc)menu.setAttribute("description",aData.desc);
                else menu.removeAttribute("description");
              }
            }else{
              menu.removeAttribute("class");
              menu.removeAttribute("description");
            }
          }

          var elm=document.getElementById(this.getToolbarItemId(o));
          if(elm){
            elm.setAttribute("image",this.main.getIconURL(o.id,o.user));
            elm.setAttribute("newMsg", o.count>0);
            if(o.count>=0){
              var str=o.accName+(o.count>=0&&aData.desc?" : "+aData.desc:"");
              var ar=o.data.folders;
              if(ar&&ar.length>0){
                for(var i=0;i<ar.length;i++){
                  str+="\n - "+(ar[i].title?ar[i].title:ar[i].id)+" : "+ar[i].count;
                }
              }
              elm.setAttribute("tooltiptext", str);
            }
            elm.setAttribute("label",this.getToolbarText(o,com.tobwithu.xnotifier.p_getBoolPref("showToolbarText")));
          }
          break;
        }
      }
    }
    var total=com.tobwithu.tooltip.makeTooltip(this.main,document.getElementById("xnotifier-tooltip-text"),this.info);

    var elm=document.getElementById("xnotifier-statusbar");
    if(elm){
      elm.setAttribute("newMsg", total>0);
      elm.setAttribute("label",total>0?total:"");
    }
    elm=document.getElementById("xnotifier-toolbar-button");
    if(elm){
      elm.setAttribute("newMsg", total>0);
      elm.setAttribute("value",total>0?total:"");
    }
  },

  /**********************************************************/
  closeWindow: function(type,name){
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
             .getService(Components.interfaces.nsIWindowMediator);
    var enm = wm.getEnumerator(type);
    while(enm.hasMoreElements()){
      var win = enm.getNext();
      if(win.name==name){
        win.close();
        return;
      }
    }
  },
  initCount: function() {
    var menu=document.getElementById("xnotifier-context-menu");
    var sep=document.getElementById("xnotifier-menu-sep");

    for(var i = 0; i < this.info.length; i++){
      if(menu.firstChild==sep)break;
      menu.removeChild(menu.firstChild);
    }
    var n=this.main.getAccountsNumber();
    this.info=[];
    for(var i=0;i<n;i++){
      if(!this.main.isAccountEnabled(i))continue;
      var obj=this.main.getAccountInfo(i);
      this.info.push(obj);
    }
    for(var i=0;i<this.info.length;i++){
      var o=this.info[i];
      o.count=0;
      if(!o.alias||o.alias.indexOf("hidden/")!=0){
        var mi = document.createElement("menuitem");
        mi.ind=o.ind;
        mi.setAttribute("id","xnotifier-mi"+o.ind);
        mi.setAttribute("label",o.accName);
        mi.addEventListener("click",function(event){com.tobwithu.xnotifier.openView(this.ind,event);},false);
        mi.setAttribute("style","color:GrayText");
        mi.setAttribute("image",this.main.getIconURL(o.id,o.user));
        menu.insertBefore(mi,sep);
      }
    }
    this.initToolbar();
  },
  onLoad: function() {
    var em=document.getElementById("xnotifier-key_openSidebar");
    if(em){
      var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                  .getService(Components.interfaces.nsIPrefService);
      var prefBranch = prefService.getBranch("extensions.xnotifier.shortcut.sidebar.");
      em.setAttribute("key",prefBranch.getCharPref("key"));
      em.setAttribute("modifiers",prefBranch.getCharPref("modifiers"));
    }
    //em=document.getElementById("xnotifier-statusbar");
    //em=document.getElementById("xnotifier-toolbarbutton-text");
    //em.setAttribute("style","color:red;font-size:12px;background-color:blue");
    if(!com.tobwithu.xnotifier.p_getBoolPref("showStatusbarIcon")){
      var elm=document.getElementById("xnotifier-statusbar");
      if(elm)elm.collapsed=true;
    }
    try {
      com.tobwithu.xnotifier.main = Components.classes["@tobwithu.com/xnotifier;1"]
                                                  .getService().wrappedJSObject;
      com.tobwithu.xnotifier.main.addListener(com.tobwithu.xnotifier);
    } catch (e){
com.tobwithu.xnotifier.dout(e);
    }
    if(com.tobwithu.xnotifier.onLoadFF)com.tobwithu.xnotifier.onLoadFF();
    window.removeEventListener("load", com.tobwithu.xnotifier.onLoad, false);
  },

  onUnload: function() {
    if(com.tobwithu.xnotifier.main)com.tobwithu.xnotifier.main.removeListener(com.tobwithu.xnotifier);
  },

  initToolbar:function(){
    var tb=document.getElementById("xnotifier-toolbar");
    //bug in Seamonkey(Mac OSX)
    var os=Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
    if(tb&&os=="Darwin"){
      var info = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
      if(info.ID=="{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}"){//Seamonkey
        tb.removeAttribute("collapsed");
      }
    }
    /////////////////////////////////////////

    if(tb&&!this.p_getBoolPref("enableToolbar")){
      tb.parentNode.removeChild(tb);
      tb=null;
    }
    if(tb){
      tb.setAttribute("mode",this.p_getBoolPref("showToolbarText")?"full":"icons");      
      var ar=tb.childNodes;
      for(var i=0;i<ar.length;i++){
        var id=ar[i].getAttribute("id");
        if(id.indexOf("xnotifier-bm")==0){
          tb.removeChild(ar[i--]);
        }
      }
      var tblist=[];
      var ar=document.getElementsByTagName("toolbar");
      for(var i=0;i<ar.length;i++){
        var list=ar[i].getAttribute("currentset").split(",");
        if(ar[i]==tb)tblist=list;
        for(var j=0;j<list.length;j++){
          if(list[j].indexOf("xnotifier-bm")==0){
            var em=document.getElementById(list[j]);
            if(em)em.parentNode.removeChild(em);
            var ti=this.createToolbarItem(this.getIndexFromId(list[j]));
            if(ti)ar[i].insertBefore(ti,ar[i].childNodes[j]);
          }
        }
      }

      for(var i=0;i<this.info.length;i++){
        var o=this.info[i];
        if(!o.alias||o.alias.indexOf("hidden/")!=0){
          var em=document.getElementById(this.getToolbarItemId(o));
          if(!em){
            var ti=this.createToolbarItem(o.ind);
            if(ti)tb.appendChild(ti);
          }/*else{
            if(em.parentNode==tb&&tblist.indexOf(this.getToolbarItemId(o))==-1){
              var ti=this.createToolbarItem(o.ind);
              if(ti)tb.insertBefore(ti,em);
              em.parentNode.removeChild(em);
            }
          }*/
        }
      }
    }
  },
  getToolbarItemId:function(o){
    return "xnotifier-bm#"+o.id+"#"+o.user;
  },
  getIndexFromId:function(id){
    var ar=id.split("#");
    for(var i=0;i<this.info.length;i++){
      var o=this.info[i];
      if(o.id==ar[1]&&o.user==ar[2])return o.ind;
    }
    return -1;
  },
  createToolbarItem: function(ind){
    if(!this.main.isAccountEnabled(ind))return null;
    var o=this.main.getAccountInfo(ind);
    var tf=com.tobwithu.xnotifier.p_getBoolPref("showToolbarText");
    var ti = document.createElement("toolbarbutton");
    ti.ind=o.ind;
    ti.setAttribute("id",this.getToolbarItemId(o));
    ti.setAttribute("class","bookmark-item xnotifier-bookmark-button");
    ti.setAttribute("label",this.getToolbarText(o,tf));
    ti.setAttribute("tooltiptext",o.accName);
    ti.setAttribute("image",this.main.getIconURL(o.id,o.user));
    ti.setAttribute("newMsg","false");
    ti.addEventListener("click",function(event){com.tobwithu.xnotifier.openView(this.ind,event);},false);
    ti.setAttribute("removable","true");
    return ti;
  },
  initToolbarMenu:function(){
    document.getElementById("xnotifier-show-text").setAttribute("checked",com.tobwithu.xnotifier.p_getBoolPref("showToolbarText"));
  },
  customizeToolbars:function(em){
    if(typeof BrowserCustomizeToolbar!="undefined")return BrowserCustomizeToolbar()
    else return SuiteCustomizeToolbar(em);
  },
  toggleToolbarText:function(tf){
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);
    var branch = prefService.getBranch("extensions.xnotifier.");
    branch.setBoolPref("showToolbarText",tf);
    
    var tb=document.getElementById("xnotifier-toolbar");
    tb.setAttribute("mode",tf?"full":"icons");    
    
    for(var i=0;i<this.info.length;i++){
      var o=this.info[i];
      if(!o.alias||o.alias.indexOf("hidden/")!=0){
        var em=document.getElementById(this.getToolbarItemId(o));
        if(em){
          em.setAttribute("label",this.getToolbarText(o,tf));
        }
      }
    }
  },
  getToolbarText:function(o,showText){
    var desc=o.data&&o.data.desc?o.data.desc:null;
    if(showText)return o.count>=0&&desc?desc+" "+o.accName:o.accName;
    else return o.count>=0&&desc?desc:"";
  },

  onLog:function(){
    var fp = Components.classes["@mozilla.org/filepicker;1"]
                 .createInstance(Ci.nsIFilePicker);
    fp.init(window, "X-notifier log",Ci.nsIFilePicker.modeSave);
    fp.defaultString="xn-firefox.log";
    fp.defaultExtension="log";
    fp.appendFilter ("X-notifier log","*.log");
    fp.appendFilters(Ci.nsIFilePicker.filterAll);
    var rv = fp.show();
    if (rv == Ci.nsIFilePicker.returnOK||rv == Ci.nsIFilePicker.returnReplace)
    {
      this.main.saveFile0(fp.file,this.main.log);
    }
  }
};

window.addEventListener("load", com.tobwithu.xnotifier.onLoad, false);
window.addEventListener("unload", com.tobwithu.xnotifier.onUnload, false);