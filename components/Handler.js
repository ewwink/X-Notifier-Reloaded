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
const ST_CHECK       = 0;
const ST_PRE         = 100;
const ST_PRE_RES     = 101;
const ST_LOGIN       = 200;
const ST_LOGIN_RES   = 201;
const ST_DATA        = 300;
const ST_DATA_RES    = 301;
const ST_LOGOUT      = 400;

const LOGIN_URL      = 0;
const LOGIN_ID       = 1;
const LOGIN_PW       = 2;
const LOGIN_DATA     = 3;
const LOGIN_POST     = 4;

/***********************************************************
Handler definition
***********************************************************/
function Handler(main){
  this.main=main;
  this.cookieManager=new CookieManager();
  this.cookieManager2=new CookieManager();
  this.loggedIn=false;
  this.reset(true);
}
Handler.prototype={
  charSet: null,
  hData: "",
  stage: 0,
  initStage: ST_LOGIN,
  count:-1,
  prevCount:-1,
  data:{},
  user: "",
  password: null,
  loginData:[],
  started:false,
  retry:1,
  asyncOnChannelRedirect: function(oldChan, newChan, flags, redirectCallback) {
    this.onChannelRedirect(oldChan, newChan, flags);
    redirectCallback.onRedirectVerifyCallback(0);
  },
  // nsIChannelEventSink
  onChannelRedirect: function (aOldChannel, aNewChannel, aFlags) {
    if(this.channel==aOldChannel)this.channel = aNewChannel;
    //if(this.userAgent)this.channel.QueryInterface(Ci.nsIHttpChannel).setRequestHeader("User-Agent",this.userAgent,false);
  },
  // nsIInterfaceRequestor
  getInterface: function (aIID) {
    try {
      return this.QueryInterface(aIID);
    } catch (e) {
//dout("getInterface "+aIID);
      throw Components.results.NS_NOINTERFACE;
    }
  },
  // nsIProgressEventSink
  onProgress : function (aRequest, aContext, aProgress, aProgressMax) { },
  onStatus : function (aRequest, aContext, aStatus, aStatusArg) { },
  // nsIHttpEventSink
  onRedirect : function (aOldChannel, aNewChannel) { },
  // nsIAuthPromptProvider
  getAuthPrompt : function(aReason){ return null; },
  QueryInterface : function(aIID) {
    if (aIID.equals(Ci.nsISupports) ||
        aIID.equals(Ci.nsIInterfaceRequestor) ||
        aIID.equals(Ci.nsIChannelEventSink) ||
        aIID.equals(Ci.nsIProgressEventSink) ||
        aIID.equals(Ci.nsIHttpEventSink) ||
        aIID.equals(Ci.nsIStreamListener)||
        aIID.equals(Ci.nsIAuthPromptProvider)||
        aIID.equals(Ci.nsIPrompt)|| //not used but required in ff 2.0
        aIID.equals(Ci.nsIDocShell)|| //required in ff 3.0
        aIID.equals(Ci.nsIAuthPrompt))
      return this;
//dout("QueryInterface "+aIID);
    throw Components.results.NS_NOINTERFACE;
  },
  onStartRequest : function (aRequest, aContext) {
    this.hData = "";
  },
  onDataAvailable : function (aRequest, aContext, aStream, aSourceOffset, aLength){
	  var is = Components.classes["@mozilla.org/scriptableinputstream;1"]
            .createInstance(Ci.nsIScriptableInputStream);
  	is.init(aStream);
  	this.hData += is.read(aLength);
  },
  onStopRequest : function (aRequest, aContext, aStatus) {
    if(aStatus==Components.results.NS_BINDING_ABORTED)return;
    var charSet=null;
    var httpChannel=aRequest.QueryInterface(Ci.nsIHttpChannel);
    if(this.charSet)charSet=this.charSet;
    else{
      var fnd=this.hData.match(/<meta.+?\".+?charset=(\S+?)\s*?;?\s*?\"\s*?\x2f?>/);
      if(fnd)charSet=fnd[1];
      else{
        try{
          if(httpChannel.contentCharset)charSet=httpChannel.contentCharset;
        }catch(e){}
      }
    }
    if(charSet){
      var uniConv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
      								.createInstance(Ci.nsIScriptableUnicodeConverter);
      try{
        uniConv.charset = charSet;
        this.hData=uniConv.ConvertToUnicode(this.hData);
      }catch(e){}
    }
    this.doNext(this.hData,aContext.QueryInterface(Ci.nsIHttpChannel));
  },
  stop : function(){
    if(this.channel){
      this.channel.cancel(Components.results.NS_BINDING_ABORTED);
    }
  },

  reset : function(isInit){
    this.count=-1;
    this.data={};
    this.data.desc=this.getDesc();
    this.stage=(this.checkLogin?ST_CHECK:this.initStage);
    this.dataURLCopy=null;
    if(!this.checkLogin&&!isInit)this.cookieManager.clear();
  },
  setLoginData:function(){
    if(this.loginData){
      var post=(this.loginData[LOGIN_DATA]?this.loginData[LOGIN_DATA]:"");
      if(this.loginData[LOGIN_ID]){
        if(post)post+="&";
        var user;
        if(this.needServer)user=this.user.split("|")[0];
        else user=this.user;
        post+=this.loginData[LOGIN_ID]+"="+encodeURIComponent(user);
      }
      if(this.loginData[LOGIN_PW]){
        if(post)post+="&";
        post+=this.loginData[LOGIN_PW]+"="+encodeURIComponent(this.password);
      }
      //this.loginData.splice(1,this.loginData.length-1);
      this.loginData[LOGIN_POST]=post;
    }
  },
  check : function(isTimer){
    if(!this.enabled)return;
    if(!this.password)return;
    this.stop();
    //this.stage=this.count<0?this.initStage:ST_DATA;
    if(this.count<0)this.reset();
    else this.stage=ST_DATA;
    this.started=true;
    if(!isTimer||this.main.prefBranch.getIntPref("activityIcon")>0)this.main.setState(this.main.MSG_CHECK_START,this.ind);
    this.doNext("");
  },
  doNext:function(aData,aHttp){
    try{
      if(!this.process(aData,aHttp))++this.stage;
    }catch(e){
      this.onError();
dout(this.id+" "+this.stage+" "+e);
    }
  },
  process:function(aData,aHttp){
    switch(this.stage){
    case ST_LOGIN:
      this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]);
      return false;
    case ST_LOGIN_RES:
      this.stage=ST_DATA;
      return this.process(aData,aHttp);
    case ST_DATA:
      if(!this.dataURLCopy)this.dataURLCopy=this.dataURL;
      this.getHtml(this.dataURLCopy);
      return false;
    case ST_DATA_RES:
      var n=parseInt(this.getCount(aData));
      var prevCount=this.count;
      this.count=isNaN(n)?-1:n;
      this.data=this.getData(aData);
      this.data.desc=this.getDesc();
      this.data.prevCount=prevCount;
      ////////delete later///////////////////
      if(this.data.folders){
        if(typeof this.data.folders[0]=="string"){
          var ar=this.data.folders;
          var ar2=[];
          for(var i=0;i<ar.length;i+=2){
            ar2.push({id:ar[i],count:ar[i+1]});
          }
          this.data.folders=ar2;
        }
      }
      ///////////////////////////////////////
      try{
        if(this.count>=0&&aHttp!=null&&aHttp.responseStatus==302){
          /*var l=aHttp.getResponseHeader("Location");
          if(l.indexOf("http")==0){
            this.dataURLCopy=l;
          }else{
            if(l.indexOf("/")==0){
              this.dataURLCopy=aHttp.URI.scheme+"://"+aHttp.URI.hostPort+l;
            }
          }*/
          this.dataURLCopy=this.channel.URI.spec;
        }
      }catch(e){
dout(e);
      }
      if(this.count<0){
        if(this.noPwd)this.password="";
        this.loggedIn=false;
        if(this.retry<1){
          ++this.retry;
          this.cookieManager.clear();
          this.check();
          return true;
        }else{
          //if(enableDebug!=0)dlog(this.id+" "+this.user+" "+this.stage+"\t"+this.hData);
          this.reset();
        }
      }else{
        this.retry=0;
        this.stage=ST_DATA;
      }
      this.main.setState(this.main.MSG_DATA,this.ind);
      if(this.main.autoLogin&&!this.noCookie){
        if(this.count>=0&&!this.loggedIn){
          if(!(this.keepLogin&&(this.main.multiSession||this.main.isUnique(this.id))))this.loggedIn=true;
          if(this.main.autoLoginDefaultAccount&&this.main.isDefault(this.id,this.user)){
            this.cookieManager.setCookieToBrowser();
          }else{
            if(this.main.multiSession)this.cookieManager.copyTo(this.cookieManager2);
          }
        }
      }
      return true;
    }
    if(this.stage<ST_PRE&&this.checkLogin){
      return this.checkLogin(aData,aHttp);
    }
dout("[onError] "+this.id+" "+this.user+" "+this.stage);
    this.onError();
    return true;
  },
  onError : function(){
    //if(enableDebug!=0)dlog(this.id+" "+this.user+" "+this.stage+"\t"+this.hData);
    if(this.noPwd)this.password="";
    this.loggedIn=false;
    this.reset();
    this.main.setState(this.main.MSG_DATA,this.ind);
  },
  onRequest : function(aHttpChannel,second){
    var cm=second?this.cookieManager2:this.cookieManager;
    var ck=cm.getCookie(aHttpChannel.URI,aHttpChannel);
    aHttpChannel.setRequestHeader("Cookie",ck, false);
  },
  onResponse : function(aHttpChannel,second){
    try {
      var cookie = aHttpChannel.getResponseHeader("Set-Cookie");
      var cm=second?this.cookieManager2:this.cookieManager;
      cm.addCookies(aHttpChannel.URI,cookie);
      aHttpChannel.setResponseHeader("Set-Cookie", "", false);
    }catch(e){}
  },
  getViewURL : function(aFolder){
    return this.viewURL;
  },
  getIconURL : function(){
    if(this.viewURL){
      try{
        var url=this.viewURL.match(/(((\S+):\/\/([^/]+))(\S*\/)?)([^/]*)/);
        if(url)return url[2]+"/favicon.ico";
      }catch(e){}
    }
    return null;
  },
  getIconPage : function(){
    return this.viewURL;
  },
  getCount : function(aData){
    return -1;
  },
  getData : function(aData){
    return {};
  },
  getDesc : function(){
    var n=this.calcCount();
    return n>0?n:"";
  },
  calcCount : function() {
    var aCount=this.count;
    if(this.main&&this.main.resetCounter){
      if(aCount>=0){
        var count=this.loadCount();
        if(aCount>=count)aCount-=count;
        else{
          this.saveCount(aCount>0?aCount:0)
          aCount=0;
        }
      }
    }
    return aCount;
  },
  loadCount:function(){
    var prefStr="accounts.["+this.id+"#"+this.user+"].count";
    var count=null;
    try{
      count=this.main.prefBranch.getIntPref(prefStr);
    }catch(e){}
    if(count==null){
      this.main.prefBranch.setIntPref(prefStr,0);
      count=0;
    }
    return count;
  },
  saveCount:function(n){
    var prefStr="accounts.["+this.id+"#"+this.user+"].count";
    this.main.prefBranch.setIntPref(prefStr,n);
  },
  getForm:function(data,name,action,end){
    var url=null;
    if(name){
      if(!end)end="<\/form>";
      var reg=new RegExp("<form([^>]+?id\\s*=\\s*[\"\']"+name+"[\"\'][\\S\\s]+?)"+end,"i");
      var s=data.match(reg);
      if(!s)return "";
      data=s[1];
    }
    if(action){
      var fnd=data.match(/action\s*=\s*[\"\'](\S+?)[\"\']/);
      if(fnd)url=fnd[1];
    }
    var re=/<input[^>]+?name\s*=\s*[\"\'](\S+?)[\"\'][^>]+?value\s*=s*[\"\']([\s\S]*?)[\"\'][\s\S]*?>/ig;
    var o;
    var post="";
    while ((o = re.exec(data)) != null){
      if(o[0].match(/type\s*=\s*[\"\']?hidden[\"\']?/i)){
        if(post)post+="&";
        post+=o[1]+"="+encodeURIComponent(o[2]);
      }
    }
    if(action)return url?[url,post]:null;
    return post;
  },
  delay:function(sec){
    if(this.dTimer)this.dTimer.cancel();
    this.dTimer=Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
    this.dTimer.initWithCallback(this,sec,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  },
  notify:function(aTimer){
    delete this.dTimer;
    this.doNext("");
  },
  setResult:function(){
    this.main.setState(this.main.MSG_DATA,this.ind);
  },
  openAuthDialog:function(id,user,url){
    var self=this;
    Components.classes["@mozilla.org/timer;1"].createInstance(Ci.nsITimer)
      .initWithCallback({notify:function(aTimer){
        var rs=self.main.openAuthDialog(id,user,url);
        self.doNext(rs);
    }},100,Ci.nsITimer.TYPE_ONE_SHOT);//make async
  },
  getScriptList:function(){
    var self=this;
    Components.classes["@mozilla.org/timer;1"].createInstance(Ci.nsITimer)
      .initWithCallback({notify:function(aTimer){
        var ar=self.main.getScriptList({});
        var str="{";
        for(var i=0;i<ar.length;i++){
          if(i>0)str+=",";
          str+="\""+ar[i]+"\":\""+self.main.getScriptVal(ar[i],"ver")+"\"";
        }
        str+="}";
        self.doNext(str);
    }},100,Ci.nsITimer.TYPE_ONE_SHOT);//make async
  }
};
Handler.prototype.baseProcess=Handler.prototype.process;
///////delete later 2013-05-07///////////
Handler.prototype.openCaptchaDialog=Handler.prototype.openAuthDialog;
/***********************************************************
load html
***********************************************************/
Handler.prototype.getHtml = function(aURL,aPostData,aHeaders,aMethod) {
  if(aURL instanceof Array){
    aPostData=aURL[1];
    aHeaders=aURL[2];
    aMethod=aURL[3];
    aURL=aURL[0];
  }
  var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
  var uri = ioService.newURI(aURL, null, null);
  var channel = ioService.newChannelFromURI(uri);
  var httpChannel = channel.QueryInterface(Ci.nsIHttpChannel);
  if (aPostData||aPostData=="") {
    var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                        .createInstance(Ci.nsIStringInputStream);
    uploadStream.setData(aPostData, aPostData.length);
    var uploadChannel = channel.QueryInterface(Ci.nsIUploadChannel);
    uploadChannel.setUploadStream(uploadStream, "application/x-www-form-urlencoded", -1);
    httpChannel.requestMethod = "POST";
  }
  //if(this.userAgent)httpChannel.setRequestHeader("User-Agent",this.userAgent,false);
  if(aHeaders){
    for(var t in aHeaders){
      httpChannel.setRequestHeader(t,aHeaders[t],false);
    }
  }
  if(aMethod)httpChannel.requestMethod=aMethod;
  this.channel=channel;
  channel.notificationCallbacks = this;
  channel.asyncOpen(this,httpChannel);
}
Handler.prototype.getCookie = function(domain,name){
  var obj = Components.classes["@mozilla.org/cookiemanager;1"].
              getService(Ci.nsICookieManager2);
  var enm = obj.enumerator;
  while(enm.hasMoreElements()){
    var ck = enm.getNext();
    ck.QueryInterface(Ci.nsICookie2);
    if(endsWith(ck.host,domain)&&ck.name==name)return ck;
  }
  return null;
};
Handler.prototype.getCookieString = function(domain,name){
  var ck=this.getCookie(domain,name);
  if(!ck)return null;
  var s=ck.name+"="+ck.value;
  if(ck.expires!=0)s+="; expires="+new Date(ck.expires*1000).toUTCString();
  if(ck.path)s+="; path="+ck.path;
  if(ck.host)s+="; domain="+ck.host;
  if(ck.secure)s+="; secure";
  if(ck.httponly)s+="; httponly";
  return s;
};
