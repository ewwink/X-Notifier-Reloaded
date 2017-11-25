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

/***********************************************************
constants
***********************************************************/

// UUID uniquely identifying our component
const CLASS_ID = Components.ID("{e3ab0980-b4e1-11db-abbd-0800200c9a66}");

// description
const CLASS_NAME = "X-notifier Service";

// textual unique identifier
const CONTRACT_ID = "@tobwithu.com/xnotifier;1";
const ADDON_ID = "{ca4a1050-ba64-482e-8257-4e2c2fd26fa5}";

const Cc=Components.classes;
const Ci=Components.interfaces;

const formSubmitURL = "user";

const dout=Components.utils.reportError;

var enableDebug=0;
/***********************************************************
class definition
***********************************************************/
//class constructor
function Main() {
  this.wrappedJSObject = this;
  var observerService = Components.classes["@mozilla.org/observer-service;1"]
                                .getService(Ci.nsIObserverService);
  observerService.addObserver(this, "http-on-modify-request", false);
  observerService.addObserver(this, "http-on-examine-response", false);
  //for uninstall
  this.uninstall=false;
  observerService.addObserver(this, "em-action-requested", false);
  observerService.addObserver(this, "quit-application-granted", false);

  if ("@mozilla.org/login-manager;1" in Components.classes){
    this.loginManager = Components.classes["@mozilla.org/login-manager;1"]
                           .getService(Ci.nsILoginManager);
  }else if ("@mozilla.org/passwordmanager;1" in Components.classes){
    this.passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                  .getService(Ci.nsIPasswordManager);
  }
  //init preferences
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Ci.nsIPrefService);
  this.prefBranch = prefService.getBranch("extensions.xnotifier.");

  //delete later 2012-10-05////////////////////////////////////
  var pb=prefService.getBranch("extensions.wmn.");
  var ver=null;
  try{ver=pb.getCharPref("version");}catch(e){}
  if(ver!=null){
    var str0="chrome://xnotifier/options";
    var str1="chrome://wmn/options";
    var str2="autoLogin";
    this.setPassword(str0,str2,this.getPassword(str1,str2));
    this.removePassword(str1,str2);
    this.importAccounts=true;
    this.showTbButton=true;
    this.convertAccounts=true;

    var ar=pb.getChildList("",{});
    for(var o of ar){
      var type=pb.getPrefType(o);
      var o2=o;
      o2=o2.replace(/\.wmn_forums\./,".app_forums.");
      if(o=="startupOpenWMN")o2="startupOpenXN";
      if(o=="mailSound")o2="alertSound";
      switch(type){
      case Ci.nsIPrefBranch.PREF_STRING:
        this.prefBranch.setComplexValue(o2,Ci.nsISupportsString,pb.getComplexValue(o,Ci.nsISupportsString));
        break;
      case Ci.nsIPrefBranch.PREF_INT:
        this.prefBranch.setIntPref(o2,pb.getIntPref(o));
        break;
      case Ci.nsIPrefBranch.PREF_BOOL:
        this.prefBranch.setBoolPref(o2,pb.getBoolPref(o));
        break;
      }
      pb.clearUserPref(o);
    }
    var file = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Ci.nsIProperties)
                       .get("ProfD", Ci.nsIFile);
    file.append("wmn");
    if(file.exists()){
      try{file.moveTo(null,"xnotifier");}catch(e){}
    }
    this.postInstall();
  }
  /////////////////////////////////////////////////////

  if(!this.prefBranch.addObserver)this.prefBranch.QueryInterface(Ci.nsIPrefBranch2);
  this.prefBranch.addObserver("", this, false);
  this.timerDelay=this.prefBranch.getIntPref("updateInterval");
  this.connectionDelay=this.prefBranch.getIntPref("connectionDelay");
  this.resetCounter=this.prefBranch.getBoolPref("resetCounter");
  this.multiSession=this.prefBranch.getBoolPref("multiSession");
  this.keepSession=this.prefBranch.getBoolPref("keepSession");
  this.countTotal=this.prefBranch.getIntPref("countTotal");
  this.autoLoginDefaultAccount=this.getAutoLoginDefaultAccount();

  var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timer.initWithCallback({notify:function(aTimer){
      try{
        var ss = Components.classes["@mozilla.org/browser/sessionstore;1"];
        if(typeof ss==="undefined"){
          ss = Components.classes["@mozilla.org/suite/sessionstore;1"];
        }
        ss = ss.getService(Components.interfaces.nsISessionStore);
        ss.persistTabAttribute("xntab");
        ss.persistTabAttribute("xnsid");
        ss.persistTabAttribute("xnid");
      }catch(e){}
  }},2000,Ci.nsITimer.TYPE_ONE_SHOT);//ff15 fix

  var tmp=this;
  this.worker={
    notify:function(aTimer){
      Main.prototype.timerWork.call(tmp,aTimer);
    }
  };
  this.lastTime=new Date().getTime();
  this.timer = Components.classes["@mozilla.org/timer;1"]
                .createInstance(Ci.nsITimer);
  this.timer.initWithCallback(this,
                                  60000,
                                  Ci.nsITimer.TYPE_REPEATING_PRECISE);

  this.workTimer = Components.classes["@mozilla.org/timer;1"]
                .createInstance(Ci.nsITimer);


  enableDebug=this.prefBranch.getIntPref("debug");

  this.loadingAnimation={
    main:this,
    current:0,
    start:function(){
      this.current=0;
      if(this.tmr)this.tmr.cancel();
      this.tmr = Cc["@mozilla.org/timer;1"]
                .createInstance(Ci.nsITimer);
      this.tmr.initWithCallback(this,
                                      100,
                                      Ci.nsITimer.TYPE_REPEATING_PRECISE);
      if(this.tmr2)this.tmr2.cancel();
      this.tmr2 = Cc["@mozilla.org/timer;1"]
                .createInstance(Ci.nsITimer);
      this.tmr2.initWithCallback(this,
                                      30000,
                                      Ci.nsITimer.TYPE_ONE_SHOT);
    },
    notify:function(aTimer){
      if(aTimer==this.tmr2){
        this.stop();
      }else{
        var text = "";
        if(this.current>=4)text=null;
        else{
          for (var i = 0; i < 4; i++) {
            text +=(i==this.current)?"\u2022":" ";
          }
        }
        this.main.setState(this.main.MSG_SET_ANI,text);
        this.current++;
        if(this.current==8)this.current=0;
      }
    },
    stop:function(){
      if(this.tmr){
        this.tmr.cancel();
        delete this.tmr;
      }
      if(this.tmr2){
        this.tmr2.cancel();
        delete this.tmr2;
      }
      this.main.setState(this.main.MSG_SET_ANI,null);
    }
  };

  this.init();//init before session restore;
}
// class definition
Main.prototype = {
  MSG_DATA:0,
  MSG_INIT:-1,
  MSG_RESET:-2,
  MSG_SHOWICON:-3,
  MSG_SHOWTBBTN:-4,
  MSG_ENABLED:-5,
  MSG_CHECK_START:-6,
  MSG_SET_ANI:-7,

  appName: "X-notifier",
  classDescription: CLASS_NAME,
  classID: CLASS_ID,
  contractID: CONTRACT_ID,
  listeners : new Array(),
  timer : null,
  initCalled : false,
  countTotal : 0,
  QueryInterface: function(aIID)
  {
    if (!aIID.equals(Ci.nsIWebProgressListener)&&
        !aIID.equals(Ci.nsISupportsWeakReference) &&
        !aIID.equals(Ci.nsISupports)){
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  }
}
Main.prototype.init2=function() {
  if (typeof AddonManager != "undefined"){
    var tmp=this;
    AddonManager.getAddonByID(ADDON_ID, function(addon) {
      tmp.checkFirstrun(addon.version);
    });
  }else{
    var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
                            .getService(Ci.nsIExtensionManager);
    var version = gExtensionManager.getItemForID(ADDON_ID).version;
    this.checkFirstrun(version);
  }
}
Main.prototype.init=function() {
////////////debug////////////////
  this.debug=false;
  this.log="";
////////////////////////////////
  try{
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
  }catch (e) {}
  if (typeof AddonManager != "undefined"){
    this.baseURL="resource://xnotifier/";
    AddonManager.addAddonListener(this);
  }else{
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Ci.nsIIOService);
    var fileHandler = ios.getProtocolHandler("file")
                         .QueryInterface(Ci.nsIFileProtocolHandler);
    var file=__LOCATION__.parent;
    this.baseURL=fileHandler.getURLSpecFromFile(file);
  }

  var str="chrome://xnotifier/options";
  var str2="autoLogin";
  this.autoLogin=this.getPassword(str,str2);
  if(this.autoLogin==null){
    this.autoLogin=1;
    this.setPassword(str,str2,this.autoLogin);
  }else this.autoLogin=parseInt(this.autoLogin);

  this.bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
           .getService(Ci.nsIStringBundleService)
           .createBundle("chrome://xnotifier/locale/overlay.properties"),
  this.userScripts={};
  this.scripts={};
  this.initScripts(true);
  this.initScripts(false);
  this.initHandlers(true);
  if(this.prefBranch.getBoolPref("startupOpenXN"))this.openXN();
  for(var l of this.listeners){
    l.onStateChange(this.MSG_INIT,this.prefBranch.getBoolPref("enabled")?1:0,null);
    for(var o of this.handlers){
      if(o.enabled){
        l.onStateChange(o.ind,o.calcCount(),o.data);
      }
    }
  }
}
Main.prototype.checkFirstrun=function(current){
  var ver = -1;
  try{
    ver = this.prefBranch.getCharPref("version");
  }catch(e){
  }finally{
    if(ver==-1||ver<"3.2"){
      this.addContentHandler();
    }

    //if(ver==-1){
    //delete later 2012-10-05////////////////
    if(ver==-1||this.showTbButton){
      delete this.showTbButton;
    ////////////////////////////////////////////
      for(var l of this.listeners){
        l.onStateChange(this.MSG_SHOWTBBTN,0,null);
      }
    }
    if(ver==-1){//first install
      var os=Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
      if(os=="Darwin")this.prefBranch.setIntPref("alertOrigin",4);
    }
    if (ver!=current){
      this.prefBranch.setCharPref("version",current);
      this.postInstall();//for fx 2
      var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      var hdl=new Handler();
      hdl.process=function(aData,aHttp) {
        hdl.timer.cancel();
        if(aData=="alive"){
          Main.prototype.openInTab("http://xnotifier.tobwithu.com/updated.php?ver="+current);
        }else{
          Main.prototype.openInTab("http://tobwithu96.cafe24.com/xnotifier/updated.php?ver="+current);
        }
      }
      var tmp={
        notify:function(aTimer){
          hdl.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
          hdl.timer.initWithCallback({
            notify:function(aTimer){
              hdl.stop();
              hdl.process();
            }
          },5000,Ci.nsITimer.TYPE_ONE_SHOT);
          hdl.getHtml("http://xnotifier.tobwithu.com/alive.php");
        }
      };
      timer.initWithCallback(tmp,1500,Ci.nsITimer.TYPE_ONE_SHOT); //Firefox 2 fix - or else tab will get closed
    }
  }
}
Main.prototype.initScripts = function(isDefault) {
  var ios = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Ci.nsIIOService);
  var fileHandler = ios.getProtocolHandler("file")
                       .QueryInterface(Ci.nsIFileProtocolHandler);
  var loader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                  .getService(Ci.mozIJSSubScriptLoader);
  if(isDefault){
    loader.loadSubScript(this.baseURL+"Handler.js");
    var info = Components.classes["@mozilla.org/xre/app-info;1"]
             .getService(Ci.nsIXULAppInfo);
    if(info.ID=="{3550f703-e582-4d05-9a08-453d09bdfdc6}"){
      this.multiSession=false;
      this.prefBranch.setBoolPref("multiSession",false);
      loader.loadSubScript(this.baseURL+"ui-tb.js");
    }else{
      if(info.ID=="{ec8030f7-c20a-464f-9b0e-13a3a9e97384}")this.isFF=true;
      loader.loadSubScript(this.baseURL+"ui.js");
    }
    loader.loadSubScript(this.baseURL+(this.prefBranch.getBoolPref("saveCookies")?"cookieManager2.js":"cookieManager.js"));
    this.dir0=this.baseURL+"scripts/";
    delete this.baseURL;
    try{
      loader.loadSubScript(this.dir0+"order.dat",this);
      loader.loadSubScript(this.dir0+"lib-socket.js");
      loader.loadSubScript(this.dir0+"lib-webupdate.js");
      loader.loadSubScript(this.dir0+"lib-rsa.js");
    }catch(e){dout(e);}
    for(var i in this.order){
      this.scripts[i]=null;
    }
  }else{
    var file = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Ci.nsIProperties)
                     .get("ProfD", Ci.nsIFile);
    file.append("xnotifier");
    this.dir1=fileHandler.getURLSpecFromFile(file);
    if(this.dir1.charAt(this.dir1.length-1)!="/"){//folder not exist
      this.dir1+="/";
    }
    if(file.exists()){
      var entries = file.directoryEntries;
      while(entries.hasMoreElements())
      {
        var t = entries.getNext();
        t.QueryInterface(Ci.nsIFile);
        var s=t.leafName;
        var fnd;
        if(fnd=s.match(/((lib-)?.+).js$/)){
          if(fnd[2]){//load library
            try{
              loader.loadSubScript((isDefault?this.dir0:this.dir1)+fnd[0]);
            }catch(e){
  dout(fnd[0]+" "+e);
            }
          }else{
            this.scripts[fnd[1]]=null;
          }
          if(!isDefault)this.userScripts[fnd[1]]=true;
        }
      }
    }
  }
}
Main.prototype.initHandler = function(obj,id,user,pass) {
  this.handlers.push(obj);
  obj.id=id;
  obj.user=user;
  obj.noPwd=pass=="\t";
  obj.password=pass=="\t"?"":pass;
  obj.inited=false;
  if(this.order[id])obj.key=this.order[id].toString();
}
Main.prototype.initHandlers = function(onInit) {
  //delete later////////////////////////////////////////
  if(this.importAccounts){
    delete this.importAccounts;
    var str="chrome://wmn/accounts/";
    var str1="chrome://xnotifier/accounts/";
    this.scripts["wmn_forums"]=null;
    if(this.loginManager){
      for(var id in this.scripts){
        var logins = this.loginManager.findLogins({},str+id,formSubmitURL, null);
        for(var o of logins) {
          this.setPassword(str1+(id.replace(/wmn_forums/,"app_forums")),o.username,o.password);
          this.removePassword(str+id,o.username);
        }
      }
    }else{
      var e = this.passwordManager.enumerator;
      while (e.hasMoreElements()) {
        try {
          var pass = e.getNext().QueryInterface(Ci.nsIPassword);
          if (pass.host.indexOf(str)==0) {
            var id=pass.host.substring(str.length);
            this.setPassword(str1+(id.replace(/wmn_forums/,"app_forums")),o.username,o.password);
            this.removePassword(str+id,o.username);
          }
        }catch(ex) {}
      }
    }
    delete this.scripts["wmn_forums"];
  }
  //////////////////////////////////////////////////////
//dout("***initHandlers "+aCheckNow);
  this.stopAll();
  this.handlers=[];
  var str="chrome://xnotifier/accounts/";
  if(this.loginManager){
    for(var id in this.scripts){
      var logins = this.loginManager.findLogins({},str+id,formSubmitURL, null);
      for(var o of logins) {
        var obj=new Handler(this);
        this.initHandler(obj,id,o.username,o.password);
      }
    }
  }else{
    var e = this.passwordManager.enumerator;
    while (e.hasMoreElements()) {
      try {
        var pass = e.getNext().QueryInterface(Ci.nsIPassword);
        if (pass.host.indexOf(str)==0) {
          var id=pass.host.substring(str.length);
          var obj=new Handler(this);
          this.initHandler(obj,id,pass.user,pass.password);
        }
      }catch(ex) {}
    }
  }
  this.handlers.sort(this.sortFunc);
  this.buildTable(onInit);
}
Main.prototype.sortFunc = function(a,b) {
  var keyA=a.key?a.key:a.id;
  var keyB=b.key?b.key:b.id;
  if(keyA<keyB)return -1;
  else if(keyA==keyB){
    if(a.user<b.user)return -1;
    else if(a.user==b.user)return 0;
    else return 1;
  }else return 1;
}
Main.prototype.loadScript = function(id,isTemp) {
  var loader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                  .getService(Ci.mozIJSSubScriptLoader);
  if(!this.scripts[id]){
//dout("loadScript "+(this.userScripts[id]?this.dir1:this.dir0)+id+".js");
    var scr={};
    loader.loadSubScript((this.userScripts[id]?this.dir1:this.dir0)+id+".js",scr);
//dout("loaded "+id+" "+isTemp);
    if(!isTemp)this.scripts[id]=scr;
//if(!isTemp)dout("load ["+id+"] "+scr.name);
    return scr;
  }else return this.scripts[id];
}
Main.prototype.buildTable = function(onInit) {
  this.stopAll();
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Ci.nsIPrefService);
  //delete later 2012-10-05////////////////////////////////////
  if(this.convertAccounts){
    delete this.convertAccounts;
    for(i=0;i<this.handlers.length;++i){
      var obj=this.handlers[i];
      var pb=prefService.getBranch("extensions.xnotifier.accounts."+obj.id+"."+obj.user+".");
      var pb2=prefService.getBranch("extensions.xnotifier.accounts.["+obj.id+"#"+obj.user+"].");
      var ar=pb.getChildList("",{});
      for(var o of ar){
        var type=pb.getPrefType(o);
        var o2=o;
        switch(type){
        case Ci.nsIPrefBranch.PREF_STRING:
          pb2.setComplexValue(o2,Ci.nsISupportsString,pb.getComplexValue(o,Ci.nsISupportsString));
          break;
        case Ci.nsIPrefBranch.PREF_INT:
          pb2.setIntPref(o2,pb.getIntPref(o));
          break;
        case Ci.nsIPrefBranch.PREF_BOOL:
          pb2.setBoolPref(o2,pb.getBoolPref(o));
          break;
        }
        pb.clearUserPref(o);
      }
    }
  }
  /////////////////////////////////////////////////////

  var i;
  for(i=0;i<this.handlers.length;++i){
    var obj=this.handlers[i];
    var pb=prefService.getBranch("extensions.xnotifier.accounts.["+obj.id+"#"+obj.user+"].");
    //// delete later /////////////////////
    try{
      var b=pb.getBoolPref("enabled");
      pb.clearUserPref("enabled");
      pb.setIntPref("enabled",b?2:0);
    }catch(e){}
    ///////////////////////////////////////
    obj.enabled=2;
    try{
      obj.enabled=pb.getIntPref("enabled");
    }catch(e){}
    try{
      obj.order=pb.getIntPref("order");
    }catch(e){}
    if(!obj.enabled||obj.inited)continue;
//dout("init "+obj.id+" "+obj.user);
    obj.cookieManager.ext="[xn#"+obj.id+"#"+encodeURIComponent(obj.user)+"]";
    obj.cookieManager2.ext="[xn#"+obj.id+"#"+encodeURIComponent(obj.user)+"#2]";
    obj.inboxOnly=true;
    obj.showFolders=true;
    //obj.alias=null;
    //obj.interval=null;
    try{
      var scr=this.loadScript(obj.id);
      for(var k in scr){
        obj[k]=scr[k];
      }
      if(obj.supportInboxOnly){
        obj.inboxOnly=true;
        try{
          obj.inboxOnly=pb.getBoolPref("inboxOnly");
        }catch(e){}
      }
      if(obj.supportShowFolders){
        obj.showFolders=true;
        try{
          obj.showFolders=pb.getBoolPref("showFolders");
        }catch(e){}
      }
      //// delete later /////////////////////
      try{
        var b=pb.getBoolPref("includeSpam");
        pb.clearUserPref("includeSpam");
        if(b)pb.setIntPref("includeSpam",2);
      }catch(e){}
      ///////////////////////////////////////
      if(obj.supportIncludeSpam){
        obj.includeSpam=0;
        try{
          obj.includeSpam=pb.getIntPref("includeSpam");
        }catch(e){}
      }
      if(obj.needLocale)obj.needServer=true;
      if(obj.needServer)obj.server=obj.user.split("|")[1];
      try{
        obj.link=pb.getComplexValue("link",Ci.nsISupportsString).data;
      }catch(e){}
      if(obj.init)obj.init();
      obj.setLoginData();
      obj.stage=obj.initStage;
      try{
        obj.interval=pb.getIntPref("interval");
      }catch(e){}
      try{
        obj.alias=pb.getComplexValue("alias",Ci.nsISupportsString).data;
      }catch(e){}
      try{
        obj.autoOpen=pb.getBoolPref("autoOpen");
      }catch(e){}
      try{
        obj.icon=pb.getComplexValue("icon",Ci.nsISupportsString).data;
      }catch(e){}
      try{
        obj.sound=pb.getComplexValue("sound",Ci.nsISupportsString).data;
      }catch(e){}
      try{
        obj.keyword=pb.getComplexValue("keyword",Ci.nsISupportsString).data;
      }catch(e){}
      if(!this.prefBranch.getBoolPref("saveCookies"))delete obj.checkLogin;
      obj.inited=true;
    }catch(e){
dout(obj.id+" "+e);
      this.handlers.splice(i,1);//not loaded
      --i;
    }
  }
  var ar0=[];
  var ar1=[];
  for(var o of this.handlers){
    if(o.order!=null){
      var ind=ar1.length;
      for(var i=0;i<ar1.length;i++){
        if(o.order<ar1[i].order){
          ind=i;
          break;
        }
      }
      ar1.splice(ind,0,o);
    }
    else ar0.push(o);
  }
  for(var o of ar1)ar0.splice(o.order,0,o);
  this.handlers=ar0;

  for(i=0;i<this.handlers.length;++i){
    this.handlers[i].ind=i;
  }

  this.hdlTable={};
  var defaults={};
  for(var i in this.scripts){
    this.hdlTable[i]=[];
    var t=null;
    try{
      t=this.prefBranch.getCharPref("defaults."+i);
    }catch(e){}
    //delete later///////////////////////
    if(t==null){
      try{
        t=this.prefBranch.getCharPref("accounts."+i+".default");
      }catch(e){}
      if(t!=null){
        this.prefBranch.clearUserPref("accounts."+i+".default");
        this.prefBranch.setCharPref("defaults."+i,t);
      }
    }
    ////////////////////////////////////
    defaults[i]=t;
    /*try{
      defaults[i]=this.prefBranch.getCharPref("defaults."+i);
    }catch(e){}*/
  }
  this.maxLen=0;
  this.groups=[];
  this.groups0=[];
  for(var o of this.handlers){
    if(o.enabled){
      if(o.user==defaults[o.id])this.hdlTable[o.id].splice(0,0,o);//default account inserted into index 0
      else this.hdlTable[o.id].push(o);
      if(this.hdlTable[o.id].length>this.maxLen)this.maxLen=this.hdlTable[o.id].length;
      o.name=this.getHostName(o.id);
      var gid=o.id;
      var group=this.groups0;
      if(o.alias){
        var fnd=o.alias.match(/(.+?)\/(.*)/);
        if(fnd){
          gid=fnd[1];
          group=this.groups;
        }
      }
      if(group[gid])++group[gid];
      else group[gid]=1;
    }
  }
  for(var i in this.hdlTable){
    var o=this.hdlTable[i];
    if(o.length>0){

      var prefStr="defaults."+i;
      var t=null;
      try{
        t=this.prefBranch.getCharPref(prefStr);
      }catch(e){}
      if(t==null)this.prefBranch.setCharPref(prefStr,o[0].user);

      //set account name
      for(var obj of o){
        if(obj.alias){
          var fnd=obj.alias.match(/(.+?)\/(.*)/);
          if(fnd){
            obj.accName=fnd[2]?(fnd[1]+"/"+fnd[2]):(obj.name+" ["+obj.user+"]");
          }else obj.accName=obj.alias;
          continue;
        }
        if(o.length>1){
          obj.accName=obj.name+" ["+obj.user+"]";
        }else obj.accName=obj.name;
      }
    }
  }

  if(!onInit)this.setState(this.MSG_RESET,0);
  if(this.prefBranch.getBoolPref("checkOnStartup")){
    var delay=Math.max(1,this.prefBranch.getIntPref("startupDelay"));
    var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    var self=this;
    var tmp={
      notify:function(aTimer){
        self.checkAll();
      }
    };
    timer.initWithCallback(tmp,delay,Ci.nsITimer.TYPE_ONE_SHOT);
  }
}
Main.prototype.isDefault = function(id,user) {
  return this.hdlTable[id].length==1||(this.hdlTable[id].length>1&&this.hdlTable[id][0].user==user);
}
Main.prototype.isUnique=function(id){
  return this.hdlTable[id].length==1;
}

Main.prototype.isOpenable = function(id,user) {
  if(this.hdlTable[id].length==1)return true;
  else if(this.hdlTable[id].length==0)return false;
  if(this.multiSession)return true;
  var ar=this.hdlTable[id];
  for(var i=0;i<ar.length;i++){
    if(ar[i].user==user)break;
    if(ar[i].calcCount()>0)return false;
  }
  return true;
}
Main.prototype.addScript = function(id) {
  var rs=this.scripts[id];
  if(id.indexOf("lib-")==0){
    try{
      var loader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                  .getService(Ci.mozIJSSubScriptLoader);
      loader.loadSubScript(this.dir1+id+".js");
    }catch(e){
dout("load library "+e);
    }
  }else{
    this.scripts[id]=null;
  }
  this.userScripts[id]=true;
  return rs?true:false; //'return rs' returns wrong value
}

Main.prototype.getHostIDs = function(count) {
  var ar=[];
  for(var i in this.scripts){
    var o={id:i};
    if(this.order[i])o.key=this.order[i].toString();
    ar.push(o);
  }
  ar.sort(this.sortFunc);
  var ar2=[];
  for(var o of ar)ar2.push(o.id);
  count.value=ar2.length;
  return ar2;
}
Main.prototype.getScriptList = function(count) {
  var ar=[];
  for(var i in this.userScripts){
    ar.push(i);
  }
  count.value=ar.length;
  return ar;
}
Main.prototype.isInstalled = function(id) {
  for(var i in this.userScripts){
    if(i==id)return true;
  }
  return false;
}
Main.prototype.getAccountsInHost = function(id) {
  return this.groups0[id]?this.groups0[id]:0;
}
Main.prototype.getAccountsInGroup = function(id) {
  return this.groups[id]?this.groups[id]:0;
}
Main.prototype.getString = function(str) {
  try{
    return this.bundle.GetStringFromName(str);
  }catch(e){}
  return str;
}
Main.prototype.getHostName = function(id) {
  try{
    return this.bundle.GetStringFromName(id);
  }catch(e){}
  try{
    var obj=this.loadScript(id,true);
    return obj.name?obj.name:id;
  }catch(e){
dout("getHostName:"+id+" "+e);
    return id;
  };
}
Main.prototype.getScriptVal = function(id,name) {
  try{
    var obj=this.loadScript(id,true);
    if(typeof obj[name]=="undefined")return null;
    return obj[name];
  }catch(e){
    return null;
  };
}
Main.prototype.getAccountsNumber = function() {
  return this.handlers.length;
}
Main.prototype.getAccountInfo = function(aIndex) {
  var obj=this.handlers[aIndex];
  var o={};
  o.id=obj.id;
  o.user=obj.user;
  o.password=obj.noPwd?"":obj.password;
  o.ind=obj.ind;
  if(obj.alias)o.alias=obj.alias;
  o.accName=obj.accName;
  return o;
}
Main.prototype.isAccountEnabled = function(aIndex) {
  var o=this.handlers[aIndex];
  if(o)return o.enabled;
  else return 0;
}
Main.prototype.getIntValue = function(name) {
  return this[name];
}
Main.prototype.setIntValue = function(name,val) {
  this[name]=val;
}

Main.prototype.addListener = function(aListener) {
  if(aListener)this.listeners.push(aListener);
  if(!this.initCalled){
    this.initCalled=true;
    this.init2();
  }
  if(aListener){
    aListener.onStateChange(this.MSG_INIT,this.prefBranch.getBoolPref("enabled")?1:0,null);
    for(var o of this.handlers){
      if(o.enabled){
        o.data.last=o.lastCheck;
        aListener.onStateChange(o.ind,o.calcCount(),o.data);
      }
    }
  }
}
Main.prototype.removeListener = function(aListener){
  for(var i=0;i<this.listeners.length;i++){
    if(this.listeners[i]==aListener){
        this.listeners.splice(i,1);
        break;
    }
  }
}
Main.prototype.check = function(aIndex) {
  var o=this.handlers[aIndex];
  if(!o.password){
    this.promptPassword(o);
    return;
  }
  o.lastCheck=new Date().getTime();
  o.check();
}
Main.prototype.stopAll = function() {
  this.workTimer.cancel();
  if(this.handlers){
    for(var o of this.handlers){
      if(o.started)o.stop();
    }
  }
}
Main.prototype.checkAll = function(isTimer) {
  this.isTimer=isTimer;
  this.workTable=[];
  var cons=Math.max(1,this.prefBranch.getIntPref("connections"));
  var maxCons=Math.max(1,this.prefBranch.getIntPref("maxConnections"));
  var now=new Date().getTime();
  var ar=[];
  var cnt={};
  for(var i in this.hdlTable)cnt[i]=0;
  for(var n=0;n<this.maxLen;n+=cons){
    for(var i in this.hdlTable){
      var o=this.hdlTable[i];
      for(var j=n;j<n+cons&&j<o.length;j++){
        var obj=o[j];
        if(!obj.password)continue;
        var interval=(obj.interval!=null?obj.interval:(obj.defaultInterval!=null?obj.defaultInterval:this.timerDelay))*60000;
        var check=false;
        if(isTimer){
          if(interval>0&&(!obj.lastCheck||obj.lastCheck+interval-1000<=now))check=true;
        }else if(interval>=0)check=true;
        if(check){
          if(cnt[i]==cons){
            this.workTable.push(ar);
            ar=[];
            for(var k in this.hdlTable)cnt[k]=0;
          }
          ++cnt[i];
          ar.push(obj);
          obj.lastCheck=now;
          obj.started=true;
        }
        if(ar.length>=maxCons){
          this.workTable.push(ar);
          ar=[];
          for(var k in this.hdlTable)cnt[k]=0;
        }
      }
    }
  }
  if(ar.length>0)this.workTable.push(ar);
  if(this.workTable.length==0)return;
  var showAni=false;
  for(var ar of this.workTable){
    for(var o of ar){
      if(o.count<0){
        showAni=true;
        break;
      }
    }
    if(showAni)break;
  }
  if(showAni||!isTimer)this.loadingAnimation.start();

  if(this.workTable.length>1){
    this.workTimer.cancel();
    this.workTimer.initWithCallback(this.worker,
                                this.connectionDelay,
                                Ci.nsITimer.TYPE_ONE_SHOT);
  }
  this.workDone=1;
  for(var o of this.workTable[0]){
    o.check(isTimer);
  }
}
Main.prototype.timerWork = function(aTimer) {
  for(var o of this.workTable[this.workDone]){
    o.check(this.isTimer);
  }
  ++this.workDone;
  if(this.workDone<this.workTable.length){
    this.workTimer.initWithCallback(this.worker,
                                this.connectionDelay,
                                Ci.nsITimer.TYPE_ONE_SHOT);
  }
}
Main.prototype.getHandler = function(aID,aUser) {
  for(var i of this.handlers){
    if(i.id==aID&&i.user==aUser)return i;
  }
  return null;
}
Main.prototype.getViewURL = function(aID,aUser,aFolder) {
  var obj=this.getHandler(aID,aUser);
  if(obj){
    if(this.autoLogin&&!obj.noCookie){
      if(this.multiSession&&(!this.isDefault(aID,aUser)||!this.autoLoginDefaultAccount)&&!obj.supportMulti){
        obj.cookieManager.copyTo(obj.cookieManager2);
      }else obj.cookieManager.setCookieToBrowser();
    }
    if(this.resetCounter&&!obj.noCounterReset){
      var url=obj.getViewURL(aFolder);
      if(obj.link!=null)url=obj.link;
      var pref="accounts.["+aID+"#"+aUser+"].count";
      try{
        this.prefBranch.getIntPref(pref);//set only if this exists
        this.prefBranch.setIntPref(pref,obj.count>0?obj.count:0);
      }catch(e){}
      obj.data.desc=obj.getDesc();
      this.setState(this.MSG_DATA,obj.ind);
      return url;
    }else{
      var url=obj.getViewURL(aFolder);
      if(obj.link!=null)url=obj.link;
      return url;
    }
  }else return null;
}
Main.prototype.getIconURL = function(aID,aUser) {
  var obj=this.getHandler(aID,aUser);
  if(obj){
    if(obj.icon)return obj.icon;
    return obj.getIconURL();
  }
  else return null;
}
Main.prototype.setResult=function(hdl) {
  this.setState(this.MSG_DATA,hdl.ind);
}
Main.prototype.setState = function(aCmd,aIndex) {
  var aData=null;
  var aCount=0;
  var openList=[];
  if(aCmd==this.MSG_DATA){
    var o=this.handlers[aIndex];
    o.started=false;
    o.data.last=o.lastCheck;
    aData=o.data;
    aCount=o.calcCount();
    var finished=true;
    for(o of this.handlers){
      if(o.started){
        finished=false;
        break;
      }
    }
    if(finished){
      var total=0;
      for(o of this.handlers){
        if(o.enabled==2&&o.count>0){
          total+=o.calcCount();
        }
      }
      if(total>this.countTotal){
        this.notification();
        for(var o of this.handlers){
          if(o.enabled==2&&o.autoOpen&&o.count>0&&o.calcCount()>0&&this.isOpenable(o.id,o.user)){
            var pre=o.data.prevCount;
            if(pre==-1||o.count>pre)openList.push(o);
          }
        }
      }else if(this.countTotal>0&&total==0){
          var win=this.findWindow("alert:alert","xn_alert");
          if(win)win.close();
      }
      this.countTotal=total;
      this.prefBranch.setIntPref("countTotal",this.countTotal);
//dout("all done");
      this.loadingAnimation.stop();
    }
  }else{//special command
    aCount=aIndex;
    aIndex=aCmd;
  }
  for(var i=0;i<this.listeners.length;i++){
    if(this.listeners[i]){
      this.listeners[i].onStateChange(aIndex,aCount,aData);
    }
  }
  for(var o of openList)this.openView(o.ind);
}
Main.prototype.notification = function() {
  if(this.prefBranch.getBoolPref("showNotification")){
    if(this.listeners.length>0){
      this.showAlertNotification();
    }
  }
  if(this.prefBranch.getBoolPref("alertSound")){
    if (!this.mSound)this.mSound = Components.classes["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
    var soundLocation = this.prefBranch.getBoolPref("customSound")?
              this.prefBranch.getCharPref("soundUrl") : "_moz_mailbeep";
    for(var o of this.handlers){
      if(o.enabled==2){
        if(o.calcCount()>0&&o.sound){
          soundLocation=o.sound;
          break;
        }
      }
    }
    if(soundLocation.indexOf("file://") == -1){
      var os = Components.classes["@mozilla.org/xre/app-info;1"]
                  .getService(Ci.nsIXULRuntime).OS;
      if(os=="Darwin")this.mSound.beep();
      else this.mSound.playSystemSound(soundLocation);
    }else{
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
      try{
        this.mSound.play(ioService.newURI(soundLocation, null, null));
      }catch(e){}
    }
  }
}
Main.prototype.openViews = function(openAll){
  var list=[];
  for(var o of this.handlers){
    if(o.enabled==2){
      if((o.count>0&&o.calcCount()>0&&this.isOpenable(o.id,o.user))
        ||(openAll&&(this.multiSession||this.isDefault(o.id,o.user)))){
        list.push(o);
      }
    }
  }
  for(var o of list)this.openView(o.ind);
}
Main.prototype.promptPassword = function(o){
  var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Ci.nsIPromptService);
  var param = {value: null};
  var check={value:false};
  var result = prompts.promptPassword(null,this.getString("promptPasswordTitle"),
    this.getString("promptPasswordText")+" : "+o.accName,param,this.getString("promptPasswordCheck"),check);
  if(!param.value)return;
  o.password=param.value;
  o.setLoginData();
  if(check.value){
    o.noPwd=false;
    this.setPassword("chrome://xnotifier/accounts/"+o.id,o.user,o.password);
  }
  o.lastCheck=new Date().getTime();
  o.check();
}
Main.prototype.openView = function(ind,folder,reload){
  var obj=this.handlers[ind];
  if(!obj.password){
    this.promptPassword(obj);
    return;
  }
  var id=obj.id;
  var user=obj.user;
  var url=this.getViewURL(id,user,folder);//call this for count set
  if(!url)return;
  if(url.indexOf("file://")==0){
    try{
      url=url.split(" ");
      var ios = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Ci.nsIIOService);
      var fileHandler = ios.getProtocolHandler("file")
                           .QueryInterface(Ci.nsIFileProtocolHandler);
      var file=fileHandler.getFileFromURLSpec(url[0]);
      var process = Components.classes["@mozilla.org/process/util;1"]
                              .createInstance(Components.interfaces.nsIProcess);
      process.init(file);
      var args = url.splice(1);
      for(var i=0;i<args.length;i++){
        args[i]=args[i].replace(/^["']/,"").replace(/["']$/,"");
      }
      process.run(false, args, args.length);
    }catch(e){
dout(e);
    }
    return;
  }
  var param=null;
  if(typeof url=="object"){//make to post
    param=url[1];
    url=url[0];
  }
  var viewDomain=obj.viewDomain;
  if(reload)viewDomain=null;
  var reuse=this.prefBranch.getBoolPref("reuseTab");
  var name=this.multiSession&&!this.isDefault(id,user)?ind:id;
  var sid=!this.multiSession||(!this.isDefault(id,user)||!this.autoLoginDefaultAccount)?ind:null;
  if(obj.supportMulti){
    name=ind;
    sid=null;
  }
  if(this.prefBranch.getBoolPref("openInTab")){
    this.openTab(url,name,reuse,viewDomain,sid,false,param);
  }else this.openWindow(url,name,reuse,viewDomain,sid,param);
}
Main.prototype.canReuse = function(cur,viewDomain) {
    if(cur.spec=="about:blank"||!viewDomain)return true;
    var host=null;
    try{
      host=cur.spec.substring(cur.scheme.length+3);
    }catch(e){}
    if(!host)return false;
    try{
      var reg=new RegExp(viewDomain);
      if(!host.match(reg))return false;
    }catch(e){}
    return true;
}

Main.prototype.findWindow = function(type,name){
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Ci.nsIWindowMediator);
  var enm = wm.getEnumerator(type);
  while(enm.hasMoreElements()){
    var win = enm.getNext();
    if(win.name==name)return win;
  }
  return null;
}
Main.prototype.openDialog = function(url, name, features,params) {
  if(params)params.wrappedJSObject=params;
  var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                      .getService(Components.interfaces.nsIWindowMediator);
  var win = wm.getMostRecentWindow("navigator:browser");
  if(win)return win.openDialog(url,name,features,params);
  else{
    var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                       .getService(Components.interfaces.nsIWindowWatcher);
    return ww.openWindow(null, url,name,features,params);
  }
}
Main.prototype.openAuthDialog = function(host,user,arg) {
  var params = {inn:{host:this.getHostName(host),user:user,secimage:arg}, out:null};
  var features = "chrome,titlebar,toolbar,centerscreen,modal";
  this.openDialog("chrome://xnotifier/content/captcha.xul","xn_"+host+":"+user,features,params).focus();
  if (params.out)return params.out.secword;
  else return null;
}
Main.prototype.showAlertNotification = function(){
  this.openDialog("chrome://xnotifier/content/alert.xul","xn_alert",
      "chrome,dialog=yes,titlebar=no,popup=yes",
      {0:this.handlers,1:this});
}
Main.prototype.openXN = function(){
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Ci.nsIWindowMediator);
  var win = wm.getMostRecentWindow("XN:Window");
  if(win){
    win.focus();
    return;
  }
  this.openDialog("chrome://xnotifier/content/xn-window.xul","xn_win",
      "chrome,toolbar=yes,dialog=no,resizable").focus();
}
Main.prototype.openOptions = function(s) {
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Ci.nsIPrefService);
  var branch = prefService.getBranch("browser.preferences.");
  var instantApply= branch.getBoolPref("instantApply");
  var features = "chrome,titlebar,toolbar,centerscreen" + (instantApply ? ",dialog=no" : ",modal");
  this.openDialog("chrome://xnotifier/content/options.xul"+(s?s:""),"xnotifier-pref",features).focus();
}
/***********************************************************
timer
***********************************************************/
Main.prototype.notify = function(aTimer) {
  var now=new Date().getTime();
  if(now-this.lastTime<60000-1000)return;
  if(this.prefBranch.getBoolPref("enabled")){
    if(now-this.lastTime>3*60000){//resume from suspend
      var self=this;
      var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      timer.initWithCallback({notify:function(aTimer){
        self.checkAll();
      }},3000,Ci.nsITimer.TYPE_ONE_SHOT);
    }else this.checkAll(true);
  }
  this.lastTime=now;
}
/***********************************************************
preference observer
***********************************************************/
Main.prototype.observe=function(aSubject, aTopic, aData)
{
  switch(aTopic){
  case "nsPref:changed":
    switch (aData) {
    case "updateInterval":
      this.timerDelay=this.prefBranch.getIntPref(aData);
      break;
    case "resetCounter":
      this.resetCounter=this.prefBranch.getBoolPref("resetCounter");
      for(var o of this.handlers){
        if(o.enabled){
          if(!this.resetCounter){
            try{
              this.prefBranch.clearUserPref("accounts.["+o.id+"#"+o.user+"].count");
              o.data.desc=o.getDesc();
            }catch(e){
dout(e);
            }
          }
          this.setState(this.MSG_DATA,o.ind);
        }
      }
      break;
    case "showStatusbarIcon":
      this.setState(this.MSG_SHOWICON,this.prefBranch.getBoolPref("showStatusbarIcon"));
      break;
    case "enabled":
      this.setState(this.MSG_ENABLED,this.prefBranch.getBoolPref("enabled"));
      break;
    case "multiSession":
      this.multiSession=this.prefBranch.getBoolPref("multiSession");
      break;
    case "debug":
      enableDebug=this.prefBranch.getIntPref("debug");
      break;
    case "autoLoginDefaultAccount":
      this.autoLoginDefaultAccount=this.getAutoLoginDefaultAccount();
      break;
    }
    break;
  case "http-on-modify-request":
    aSubject.QueryInterface(Ci.nsIHttpChannel);
    for(var i of this.handlers){
      if(i.enabled){
        if(i.channel==aSubject){
          i.onRequest(aSubject);
          return;
        }
      }
    }
    if(this.multiSession){
      var domWin=this.getWinFromChannel(aSubject);
//dout(aSubject.URI.spec+" "+domWin);
      if(domWin){
        var tab=this.getTabFromWin(domWin);
        if(tab){
          var sid=tab.getAttribute("xnsid");
          if(sid!=""){
            if(sid>=0)this.handlers[sid].onRequest(aSubject,true);
          }else if(domWin.opener){
            var tab0=this.getTabFromWin(domWin.opener);
            var sid=tab0.getAttribute("xnsid");
            if(sid!=""){
              tab.setAttribute("xnsid",sid);
              if(sid>=0)this.handlers[sid].onRequest(aSubject,true);
            }
          }else if(this.keepSession){
            var cWin=this.getChromeFromWin(domWin);
            if(cWin.opener){//set sid for new window
              var tab0=cWin.opener.gBrowser.selectedTab;
              var sid=tab0.getAttribute("xnsid");
              if(sid!=""){
                tab.setAttribute("xnsid",sid);
                if(sid>=0)this.handlers[sid].onRequest(aSubject,true);
                return;
              }
            }
            tab.setAttribute("xnsid",-1);
          }
        }
      }
    }
    break;
  case "http-on-examine-response":
    aSubject.QueryInterface(Ci.nsIHttpChannel);
    for(var i of this.handlers){
      if(i.channel==aSubject){
        i.onResponse(aSubject);
        break;
      }
    }
    if(this.multiSession){
      var domWin=this.getWinFromChannel(aSubject);
      if(domWin){
        var tab=this.getTabFromWin(domWin);
        if(tab){
          var sid=tab.getAttribute("xnsid");
          if(sid!=""&&sid>=0){
            this.handlers[sid].onResponse(aSubject,true);
          }
        }
      }
    }
    break;
  case "em-action-requested":
    aSubject.QueryInterface(Ci.nsIUpdateItem);
    if(aSubject.id == ADDON_ID) {
      if (aData == "item-uninstalled") {
        this.uninstall = true;
      } else if (aData == "item-cancel-action") {
        this.uninstall = false;
      }
    }
    break;
  case "quit-application-granted":
    if(this.uninstall){
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                              .getService(Components.interfaces.nsIPromptService);
      var result = prompts.confirm(null, this.appName,this.getString("clearSettings"));
      if(!result)return;
      var str="chrome://xnotifier/";
      if(this.loginManager){
        var logins = this.loginManager.getAllLogins({});
        for(var o of logins) {
          if(o.hostname.indexOf(str)==0)this.loginManager.removeLogin(o);
        }
      }else{
        var e = this.passwordManager.enumerator;
        while (e.hasMoreElements()) {
          var o = e.getNext().QueryInterface(Ci.nsIPassword);
          if (o.host.indexOf(str)==0)this.passwordManager.removeUser(o.host,o.user);
        }
      }

      var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Ci.nsIPrefService);
      var prefBranch = prefService.getBranch("");
      try{ prefBranch.deleteBranch("extensions.xnotifier."); }catch(e){}
      prefService.savePrefFile(null);

      var ios = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Ci.nsIIOService);
      var fileHandler = ios.getProtocolHandler("file")
                          .QueryInterface(Ci.nsIFileProtocolHandler);
      var file=fileHandler.getFileFromURLSpec(this.dir1);
      try{file.remove(true);}catch(e){}

      this.removeContentHandler();
    }
    break;
  }
}
Main.prototype.initCookieHandler=function(doc,tab,ind){

  try{
    var docObj=doc.wrappedJSObject;
    if(!docObj)return;

    if(!doc.com)doc.com={};
    if(!doc.com.tobwithu)doc.com.tobwithu={};
    if(!doc.com.tobwithu.xnotifier){
      doc.com.tobwithu.xnotifier={};

      if(Object.defineProperty){
        var hdls=this.handlers;
        Object.defineProperty(docObj, 'cookie',{
            get: function(){
              var sid=tab.getAttribute('xnsid');
              if(sid!=""&&sid>=0){
                var cm=hdls[sid].cookieManager2;
                return cm.getCookie(doc.location.href);
              }
            },
            set: function(val){
              var sid=tab.getAttribute('xnsid');
              if(sid!=""&&sid>=0){
                var cm=hdls[sid].cookieManager2;
                cm.addCookies(doc.location.href,val);
              }
            }
          });
        }

        if(this.keepSession){
        try{
          doc.com.tobwithu.xnotifier.open=docObj.defaultView.open;
          var self=this;
          docObj.defaultView.open=function(url){
            var win0;
            var ar=Array.prototype.slice.call(arguments,0);
            if(Components.utils.cloneInto){
              var sandbox = new Components.utils.Sandbox(doc.defaultView);
              sandbox.win=docObj.defaultView;
              sandbox.ar = Components.utils.cloneInto(ar, sandbox);
              sandbox.open=doc.com.tobwithu.xnotifier.open;
              var src="var win0=win.open.apply(win,ar);";
              Components.utils.evalInSandbox(src,sandbox);
              win0=sandbox.win0;
            }else{
              win0=doc.com.tobwithu.xnotifier.open.apply(docObj.defaultView,ar);
            }

            if(win0){
              var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                                  .getService(Components.interfaces.nsIWindowMediator);
              win = wm.getMostRecentWindow("navigator:browser");
              var tabbrowser=win.getBrowser();
              var tab=tabbrowser.selectedTab;
              tab.setAttribute("xnsid",ind);
            }
            return win0;
          }
        }catch(e0){
dout(e0);
        }}
    }
  }catch(e){
dout(e);
  }
}

Main.prototype.onStateChange=function(webProgress, request, state, status) {
//dout("\t\t"+request.name+" @@@@@state "+webProgress+" "+request+" "+state.toString(16)+" "+status);
//if(state&(Ci.nsIWebProgressListener.STATE_STOP|Ci.nsIWebProgressListener.STATE_IS_DOCUMENT)){
  var wpl=Ci.nsIWebProgressListener;
  var mask=wpl.STATE_START|wpl.STATE_IS_REQUEST;
  if((state&mask^mask)==0){
    var domWin=webProgress.DOMWindow;
    if(domWin){
      var doc=domWin.document;
      if(doc.com && doc.com.tobwithu && doc.com.tobwithu.xnotifier)return; //speed up
      var tab=this.getTabFromWin(domWin);
      if(tab){
        var sid=tab.getAttribute("xnsid");
        if(sid!=""&&sid>=0){
          this.initCookieHandler(domWin.document,tab,sid);
        }
      }
    }
  }
}
Main.prototype.onLocationChange=function(webProgress, request, location) {
}
Main.prototype.onProgressChange=function(webProgress, request, curSelfProgress) {
}
Main.prototype.onSecurityChange=function(webProgress, request, state) {
}
Main.prototype.onStatusChange=function(webProgress, request, status, message) {
}
Main.prototype.onUninstalling=function(addon,restart){
  if(addon.id==ADDON_ID){
    this.uninstall=true;
  }
}
Main.prototype.onOperationCancelled=function(addon){
  if(addon.id==ADDON_ID){
    if(this.uninstall)this.uninstall=false;
  }
}
Main.prototype.postInstall=function(){
  var s1="accounts.[app_forums#default].enabled";
  var s2="chrome://xnotifier/accounts/app_forums";
  if(this.getPassword(s2,"default")==null){
    this.setPassword(s2,"default","1");
    this.prefBranch.setBoolPref(s1,false);
  }
  s1="accounts.[scripts#default].enabled";
  s2="chrome://xnotifier/accounts/scripts";
  if(this.getPassword(s2,"default")==null){
    this.setPassword(s2,"default","1");
    this.prefBranch.setBoolPref(s1,false);
  }
}
Main.prototype.getWinFromChannel=function(aChannel){
  var loadContext;
  try {
    loadContext = aChannel.notificationCallbacks.getInterface(Components.interfaces.nsILoadContext);
  }catch(ex){
    try {
      loadContext = aChannel.loadGroup.notificationCallbacks.getInterface(Components.interfaces.nsILoadContext);
    }catch(ex){
      loadContext = null;
    }
  }
  if(loadContext!=null){//ff3.5 or later
    try{
      return loadContext.associatedWindow;
    }catch(e){}
  }
  try{
    return aChannel.notificationCallbacks.getInterface(Ci.nsIDOMWindow);
  }catch(e){}
  try{
    return aChannel.loadGroup.notificationCallbacks.getInterface(Ci.nsIDOMWindow);
  }catch(e){}
  return null;
}
Main.prototype.getTabFromWin=function(domWin){
  if(!domWin)return null;
  try{
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
             .getService(Ci.nsIWindowMediator);
    var enm = wm.getEnumerator("navigator:browser");
    while(enm.hasMoreElements()){
      var win=enm.getNext();
      if(!win.getBrowser)continue;
      var tabbrowser=win.getBrowser();
      var ind=tabbrowser.getBrowserIndexForDocument(domWin.top.document);
      if(ind<0)continue;
      var tab = tabbrowser.tabContainer.childNodes[ind];
      if(tab)return tab;
    }
  }catch (e){
dout(e);
  }
  return null;
}
Main.prototype.getChromeFromWin=function(domWin){
  if(!domWin)return null;
  try{
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
             .getService(Ci.nsIWindowMediator);
    var enm = wm.getEnumerator("navigator:browser");
    while(enm.hasMoreElements()){
      var win=enm.getNext();
      var tabbrowser=win.getBrowser();
      var ind=tabbrowser.getBrowserIndexForDocument(domWin.top.document);
      if(ind>=0)return win;
    }
  }catch (e){
dout(e);
  }
  return null;
}

/***********************************************************
password manager
***********************************************************/
Main.prototype.getPassword=function(host,user){
  if(this.loginManager){
    var logins = this.loginManager.findLogins({},host,formSubmitURL, null);
    for(var o of logins) {
      if (o.username==user) {
        return o.password;
      }
    }
  }else{
    var e = this.passwordManager.enumerator;
    while (e.hasMoreElements()) {
      try {
        var pass = e.getNext().QueryInterface(Ci.nsIPassword);
        if (pass.host == host&&pass.user == user) {
           return pass.password;
        }
      }catch(ex) {}
    }
  }
  return null;
}
Main.prototype.setPassword=function(host,user,passwd){
  if(!passwd)passwd="\t";
  if(this.loginManager){
    var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                                 Ci.nsILoginInfo,
                                                 "init");
    var loginInfo = new nsLoginInfo(host, formSubmitURL, null, user, passwd, "", "");

    var logins = this.loginManager.findLogins({},host,formSubmitURL, null);
    for(var o of logins) {
      if (o.username==user) {
        this.loginManager.modifyLogin(o,loginInfo);
        return;
      }
    }
    this.loginManager.addLogin(loginInfo);
  }else{
    try{
      this.passwordManager.removeUser(host,user);
    }catch(e){}
    this.passwordManager.addUser(host,user,passwd);
  }
}
Main.prototype.removePassword=function(host,user){
  if(this.loginManager){
    var logins = this.loginManager.findLogins({},host,formSubmitURL, null);
    for(var o of logins) {
      if (o.username==user) {
        this.loginManager.removeLogin(o);
        break;
      }
    }
  }else{
    try{
      this.passwordManager.removeUser(host,user);
    }catch(e){}
  }
}
Main.prototype.loadFile=function(name){
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Ci.nsIProperties)
                         .get("ProfD", Ci.nsIFile);
  name=name.split("/");
  for(var o of name)file.append(o);
  return this.loadFile0(file);
}

Main.prototype.loadFile0=function(file){
  var str="";
  try {
    var fis = Components.classes["@mozilla.org/network/file-input-stream;1"]
                          .createInstance(Ci.nsIFileInputStream);
    fis.init(file, 0x01, 0o664, 0);
    var is = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                       .createInstance(Ci.nsIConverterInputStream);
    is.init(fis, "UTF-8", 1024, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

    var s = {};
    while (is.readString(4096, s) != 0) {
      str+=s.value;
    }
    is.close();
    fis.close();
  }catch(e){
//dout(e);
  }
  return str;
}
Main.prototype.saveFile=function(name,str,append){
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Ci.nsIProperties)
                     .get("ProfD", Ci.nsIFile);
  name=name.split("/");
  for(var i in name){
    file.append(name[i]);
    if(i<name.length-1){
      if(!file.exists()){
        file.create(Ci.nsIFile.DIRECTORY_TYPE,0o755);
      }
    }
  }
  return this.saveFile0(file,str,append);
}
Main.prototype.saveFile0=function(file,str,append){
  try{
    var fos = Components.classes["@mozilla.org/network/file-output-stream;1"]
                          .createInstance(Ci.nsIFileOutputStream);
    fos.init(file, 0x02 | 0x08 |(append?0x10:0x20), 0o664, 0);
    var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                       .createInstance(Ci.nsIConverterOutputStream);
    os.init(fos, "UTF-8", 0, 0x0000);
    os.writeString(str);
    os.close();
    fos.close();
  }catch(e){
dout(e);
  }
  return file;
}
Main.prototype.deleteFile=function(name){
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Ci.nsIProperties)
                     .get("ProfD", Ci.nsIFile);
  name=name.split("/");
  for(var o of name)file.append(o);
  if(file.exists()){
    file.remove(false);
  }
}
Main.prototype.removeHost=function(aHostID){
  try{
    this.prefBranch.deleteBranch("accounts.["+aHostID);
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Ci.nsIPrefService);
    prefService.savePrefFile(null);
  }catch(e){
dout(e);
  }
  for(var o of this.handlers){
    if(o.id==aHostID){
      this.removePassword("chrome://xnotifier/accounts/"+o.id,o.user);
    }
  }
  delete this.scripts[aHostID];
  delete this.userScripts[aHostID];
}
Main.prototype.getAutoLoginDefaultAccount=function(){
  var b=this.prefBranch.getBoolPref("autoLoginDefaultAccount");
  if(b){
    try{
      var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                  .getService(Ci.nsIPrefService);
      var branch = prefService.getBranch("browser.privatebrowsing.");
      if(branch.getBoolPref("autostart")){
        return false;
      }
    }catch(e){}
  }
  return b;
}
Main.prototype.addContentHandler=function(){
  try{
    Cc["@mozilla.org/embeddor.implemented/web-content-handler-registrar;1"]
      .getService(Ci.nsIWebContentHandlerRegistrar)
      .registerContentHandler("application/vnd.mozilla.maybe.feed","chrome://xnotifier/content/addfeed.xul?url=%s","X-notifier",null);
  }catch(e){}
}
Main.prototype.removeContentHandler=function(){
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Ci.nsIPrefService);
  var branch;
  for(var i=0;;i++){
    branch=prefService.getBranch("browser.contentHandlers.types."+i+".");
    try{
      var title=branch.getCharPref("title");
      if(title=="X-notifier"){
        try{ branch.deleteBranch(""); }catch(e){}
        prefService.savePrefFile(null);
        break;
      }
    }catch(e){
      break;
    }
  }
}
/***********************************************************
class factory

This object is a member of the global-scope Components.classes.
It is keyed off of the contract ID.
***********************************************************/
var XnotifierFactory = {
  createInstance: function (aOuter, aIID)
  {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    return (new Main()).QueryInterface(aIID);
  }
};

/***********************************************************
module definition (xpcom registration)
***********************************************************/
var XnotifierModule = {
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType)
  {
    aCompMgr = aCompMgr.
        QueryInterface(Ci.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME,
        CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType)
  {
    aCompMgr = aCompMgr.
        QueryInterface(Ci.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);
  },

  getClassObject: function(aCompMgr, aCID, aIID)
  {
    if (!aIID.equals(Ci.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (aCID.equals(CLASS_ID))
      return XnotifierFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
  canUnload: function(aCompMgr) { return true; }
};

/***********************************************************
module initialization

When the application registers the component, this function
is called.
***********************************************************/
try{
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
  if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([Main]);
}catch(e){}
if(typeof NSGetFactory == "undefined"){
  function NSGetModule(aCompMgr, aFileSpec) { return XnotifierModule; }
}

/***********************************************************
CookieManager definition
***********************************************************/
function endsWith(s1,s2){
  if(!s2)return false;
  var n=s1.toLowerCase().lastIndexOf(s2.toLowerCase());
  return n==-1?false:(n==s1.length-s2.length);
}
function CookieInfo(){
}
CookieInfo.prototype={
  getDomain:function(){
    if(this.domain)return this.domain;
    /*if(this.domain){
      if(this.domain.charAt(0)!=".")return "."+this.domain;
      else return this.domain;
    }*/
    return this.uri.host;
  },
  getPath:function(){
    if(this.path)return this.path;
    var path=this.uri.path;
    var i=path.indexOf("?");
    if(i!=-1)path=path.substring(0,i);
    i=path.lastIndexOf("/");
    if(i==-1)return path;
    else return path.substring(0,i+1);
  },
  getExpiry:function(){
    if(!this.expires)return 0x7ffffffffffffdff;
    var exp=this.expires;
    exp=exp.replace(/-(.+?)-(\d{2}) /," $1 20$2 ").replace(/-/g," ");
    return Date.parse(exp)/1000;
  },
  toString:function(){
      var s=this.name+"="+this.value;
      for(var p in this){
        if(typeof this[p] == "function")continue;
        if(p=="httponly"||p=="secure"){
          s+="; "+p;
        }else if(p!="name"&&p!="value"&&p!="uri"){
          s+="; "+p+"="+this[p];
        }
      }
    return s;
  }
}

////////////////for debug//////////////////////////////////
function dlog(str,s2){
  if(typeof main =="undefined")main=Components.classes["@tobwithu.com/xnotifier;1"].getService().wrappedJSObject;
  str=new Date()+"\t"+str+"\t"+(s2.replace(/\r/g,"\\r").replace(/\n/g,"\\n").replace(/\t/g,"\\t"))+"\r\n";
  main.log+=str;
}
///////////////////////////////////////////////////////////
Main.prototype.toggleDebug=function(){
  this.debug=!this.debug;
  for(i=0;i<this.handlers.length;++i){
    this.handlers[i].debug=this.debug;
  }
}
