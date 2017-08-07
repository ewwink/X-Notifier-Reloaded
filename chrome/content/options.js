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

const dout=Components.utils.reportError;

const Ci=Components.interfaces;
const PM_URI="chrome://xnotifier/accounts/";
const PREF_BRANCH="extensions.xnotifier.accounts.";
var prefBranch;
var prefService;
var accountsChanged=false;
var rebuildTree=false;
var arDefault;
var arAccounts;
var arDeleted;
var keyNum;
var autoLogin;
var appMain;
var current;

function onLoad() {
  if(!checkMasterPasswords()){
    window.close();
    return;
  }
  appMain = Components.classes["@tobwithu.com/xnotifier;1"]
              .getService().wrappedJSObject;
  appMain.addListener(null);
  keyNum=0;
  prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Ci.nsIPrefService);
  prefBranch = prefService.getBranch("");

  arAccounts=[];
  arDeleted=[];
  var obj=document.getElementById("xnotifier-hosts");
  _loadDefault(obj);
  obj.selectedIndex=0;
  var n=appMain.getAccountsNumber();
  for(var i=0;i<n;i++){
    var o=appMain.getAccountInfo(i);
    _getValues(o,false,false);
    addItem(o);
  }
  checkDefault();
  autoLogin=appMain.getIntValue("autoLogin");
  document.getElementById("autologin").checked=autoLogin;
  toggleSubitem("autologin","autoLoginDefaultAccount");

  onSelect(-1);
  toggleSubitem("show-notification","auto-hide");
  toggleSubitem('multiss','keepSession');
  toggleSubitem('reuseTab','reloadTab');

  var s=window.location.search;
  s=s.match(/url=(\S+?)(&|$)/);
  if(s){
    document.getElementById("xnotifier-hosts").value="rss";
    customizeAdvancedView();
    var url=decodeURIComponent(s[1]);
    document.getElementById("username").value=url;
    checkIsNew();
    if(!document.getElementById("btn-add").disabled){
      onAdd();
    }
  }

  if(prefBranch.getBoolPref("extensions.xnotifier.clearPasswdAlert")){
  var sanitize=false;
  try{sanitize=prefBranch.getBoolPref("privacy.sanitize.sanitizeOnShutdown");}catch(e){}
  var clearPass=null;
  var clearPassPref="privacy.clearOnShutdown.passwords";
  try{clearPass=prefBranch.getBoolPref(clearPassPref);}catch(e){}
  if(clearPass==null){
    clearPassPref="privacy.item.passwords";
    try{clearPass=prefBranch.getBoolPref(clearPassPref);}catch(e){} //for fx 2
  }

  if(sanitize&&clearPass){
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService);
    var check = {value: prefBranch.getBoolPref("extensions.xnotifier.clearPasswdAlert")};
    var res=prompts.confirmCheck(null, getString("clearPasswordAlertTitle"), getString("clearPasswordAlertText"),
                     getString("clearPasswordAlertCheck"), check);
    if(res){
      prefBranch.setBoolPref(clearPassPref,false);
    }
    prefBranch.setBoolPref("extensions.xnotifier.clearPasswdAlert",check.value);
    }
  }
}

function onAccept() {
  if(accountsChanged){
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);
    for(var o of arDeleted){//check deleted accounts;
      appMain.removePassword(PM_URI+o.id,o.user);
      var s=PREF_BRANCH+"["+o.id+"#"+o.user+"]";
      try{ prefBranch.deleteBranch(s); }catch(e){}
    }
    if(arDeleted)prefService.savePrefFile(null);
  }
  if(accountsChanged||rebuildTree){
    for(var id in arDefault){//check default accounts
      var str="extensions.xnotifier.defaults."+id;
      var t=null;
      try{
        t=prefBranch.getCharPref(str);
      }catch(e){}
      if(t!=arDefault[id]){
        if(arDefault[id])prefBranch.setCharPref(str,arDefault[id]);
        else prefBranch.clearUserPref(str);
      }
    }
    var def=document.getElementById("updateInterval").value;
    for(var o of arAccounts){//check newly added accounts
      _setInt(o.id,o.user,"enabled",o.enabled);
      if(appMain.getScriptVal(o.id,"supportInboxOnly"))_setBool(o.id,o.user,"inboxOnly",o.inboxOnly);
      if(appMain.getScriptVal(o.id,"supportShowFolders"))_setBool(o.id,o.user,"showFolders",o.showFolders);
      if(appMain.getScriptVal(o.id,"supportIncludeSpam"))_setInt(o.id,o.user,"includeSpam",o.includeSpam);
      _setBool(o.id,o.user,"autoOpen",o.autoOpen);
      _setUniChar(o.id,o.user,"alias",o.alias);
      _setUniChar(o.id,o.user,"link",o.link);
      var scrDef=appMain.getScriptVal(o.id,"defaultInterval");
      _setInt(o.id,o.user,"interval",o.interval,scrDef!=null?scrDef:def);
      _setInt(o.id,o.user,"order",o.order,null);
    }
    if(accountsChanged){
      for(var o of arAccounts){
        if(o.isNew){
          appMain.setPassword(PM_URI+o.id,o.user,o.password);
        }
      }
    }
  }
  var val=document.getElementById("autologin").checked?1:0;
  if(val!=autoLogin){
    var str="chrome://xnotifier/options";
    var str2="autoLogin";
    appMain.setIntValue(str2,val);
    appMain.setPassword(str,str2,val);
  }
  if(accountsChanged||main.hostDeleted){
    appMain.initHandlers();
  }else if(rebuildTree){
    appMain.buildTable();
  }
  return false;
}
function onHelp(){
  appMain.openLink("http://xnotifier.tobwithu.com/dp/forum/3");
}
function _setBool(host,user,name,val){
  var prefStr=PREF_BRANCH+"["+host+"#"+user+"]."+name;
  var t=null;
  try{
    t=prefBranch.getBoolPref(prefStr);
  }catch(e){}
  if(t!=val){
    prefBranch.setBoolPref(prefStr,val);
  }
}
function _setInt(host,user,name,val,defVal){
  var prefStr=PREF_BRANCH+"["+host+"#"+user+"]."+name;
  var t=null;
  try{
    t=prefBranch.getIntPref(prefStr);
  }catch(e){}
  if(t!=val){
    if(val!=defVal)prefBranch.setIntPref(prefStr,val);
    else{
      try{prefBranch.clearUserPref(prefStr);}catch(e){}
    }
  }
}
function _setUniChar(host,user,name,val){
  var prefStr=PREF_BRANCH+"["+host+"#"+user+"]."+name;
  var t=null;
  try{
    t=prefBranch.getComplexValue(prefStr,Components.interfaces.nsISupportsString).data;
  }catch(e){}
  if(t!=val){
    if(val){
      var str = Components.classes["@mozilla.org/supports-string;1"]
            .createInstance(Components.interfaces.nsISupportsString);
      str.data = val;
      prefBranch.setComplexValue(prefStr,Components.interfaces.nsISupportsString, str);
    }else{
      try{prefBranch.clearUserPref(prefStr);}catch(e){}
    }
  }
}
function onCancel(){
  if((prefBranch.getBoolPref("browser.preferences.instantApply"))){//not window. close button only
    onAccept();
  }else if(main.hostDeleted){
    appMain.initHandlers();
  }
}
function _loadDefault(obj){
  arDefault=[];
  var ar=appMain.getHostIDs({});
  for(var id of ar){
    var s=appMain.getHostName(id);
    if(s==null)continue;
    if(obj)obj.appendItem(s,id);
    try{
      arDefault[id]=prefBranch.getCharPref("extensions.xnotifier.defaults."+id);
    }catch(e){}
  }
}
function getAccount(aKey){
  for(var o of arAccounts){
    if(o.key==aKey)return o;
  }
  return null;
}
function setDefault(aKey){
  var o=getAccount(aKey);
  if(!o.enabled||arDefault[o.id]==o.user)return;
  arDefault[o.id]=o.user;
  checkDefault();
  rebuildTree=true;
}
function setEnabled(disable,aKey){
  var o=getAccount(aKey);
  o.enabled=disable?0:2;
  if(disable){
    if(arDefault[o.id]==o.user)arDefault[o.id]=null;
  }
  checkDefault();
  rebuildTree=true;
}

function checkDefault(){
  for(var o of arAccounts){
    var em=document.getElementById("is-default"+o.key);
    if(o.enabled){
      if(!arDefault[o.id])arDefault[o.id]=o.user;
      var val=o.user==arDefault[o.id];
      em.setAttribute("checked",val);
      em.setAttribute("disabled",val);
    }else{
      em.setAttribute("checked",false);
      em.setAttribute("disabled",true);
    }
  }
}
function onSelect(aIndex){
  if(aIndex<0){
    document.getElementById("username").value="";
    document.getElementById("password").value="";
    document.getElementById("server").value="";
    document.getElementById("inbox-only").checked=true;
    document.getElementById("show-folders").checked=true;
    document.getElementById("auto-open").checked=false;
    document.getElementById("alias").value="";
    document.getElementById("link").value="";
    document.getElementById("interval").value=document.getElementById("updateInterval").value;
    current=null;
    setAddMode(true);
  }else{
    var o=arAccounts[aIndex];
    document.getElementById("xnotifier-hosts").value=o.id;
    if(o.user.indexOf("|")!=-1){
      var ar=o.user.split("|");
      document.getElementById("username").value=ar[0];
      document.getElementById("server").value=ar[1];
    }else{
      document.getElementById("username").value=o.user;
      document.getElementById("server").value="";
    }
    document.getElementById("password").value=o.password;
    document.getElementById("inbox-only").checked=o.inboxOnly;
    document.getElementById("include-spam").checked=o.includeSpam?true:false;
    document.getElementById("show-folders").checked=o.showFolders;
    document.getElementById("auto-open").checked=o.autoOpen;
    document.getElementById("alias").value=o.alias?o.alias:"";
    document.getElementById("link").value=o.link?o.link:"";
    var def=appMain.getScriptVal(o.id,"defaultInterval");
    document.getElementById("interval").value=o.interval!=null?o.interval:(def!=null?def:document.getElementById("updateInterval").value);
    current=o;
    setAddMode(false);
  }
  setColor(document.getElementById("interval"));
  customizeAdvancedView();
}
function getString(aName) {
  var strbundle = document.getElementById("xnotifier-strings");
  return strbundle.getString(aName);
}
function onAdd(){
  var user=document.getElementById("username").value;
  if(!user)return;
  var server=document.getElementById("server").value;
  if(server)user+="|"+server;
  var passwd=document.getElementById("password").value;
  var host=document.getElementById("xnotifier-hosts").value;
  if(host=="rss")passwd="1";
  user=_addAcount(host,user,passwd,true);
  if(user.indexOf("|")!=-1)user=user.substring(0,user.indexOf("|"));
  document.getElementById("username").value=user;
  checkIsNew();
}
function getIndex(host,user){
  user=getFullUsername(host,user);
  var o;
  for(var i in arAccounts){
    o=arAccounts[i];
    if(o.id==host&&o.user==user){
      return i;
      break;
    }
  }
  return -1;
}
function getFullUsername(host,user){
  var server;
  if(user.indexOf("|")!=-1){
    var ar=user.split("|");
    user=ar[0];
    server=ar[1];
  }
  var hostStr=appMain.getScriptVal(host,"hostString");
  if(hostStr&&user.indexOf("@")==-1){
    user=user+"@"+hostStr;
  }else if((hostStr=="")&&user.indexOf("@")!=-1){
    user=user.substring(0,user.indexOf("@"));
  }
  if(server)return user+"|"+server;
  else return user;
}
function _getValues(o,isNew,byUser){
  o.enabled=2;
  o.inboxOnly=true;
  o.showFolders=true;
  if(typeof(o.alias)=="undefined")o.alias=null;
  if(typeof(o.interval)=="undefined")o.interval=null;
  o.order=null;
  o.isNew=isNew;
  if(isNew&&byUser){//user input
    o.inboxOnly=document.getElementById("inbox-only").checked;
    o.showFolders=document.getElementById("show-folders").checked;
    o.includeSpam=document.getElementById("include-spam").checked?2:0;
    o.autoOpen=document.getElementById("auto-open").checked;
    var alias=document.getElementById("alias").value;
    if(alias)o.alias=alias;
    var link=document.getElementById("link").value;
    if(link)o.link=link;
    var interval=document.getElementById("interval").value;
    if(!isNaN(parseInt(interval)))o.interval=interval;
  }else{
    var prefStr=PREF_BRANCH+"["+o.id+"#"+o.user+"].";
//// delete later /////////////////////
    try{
      var b=prefBranch.getBoolPref(prefStr+"enabled");
      prefBranch.clearUserPref(prefStr+"enabled");
      prefBranch.setIntPref(prefStr+"enabled",b?2:0);
    }catch(e){}
    ///////////////////////////////////////
    try{
      o.enabled=prefBranch.getIntPref(prefStr+"enabled");
    }catch(e){}
    try{
      o.inboxOnly=prefBranch.getBoolPref(prefStr+"inboxOnly");
    }catch(e){}
    //// delete later /////////////////////
    try{
      var b=prefBranch.getBoolPref(prefStr+"includeSpam");
      prefBranch.clearUserPref(prefStr+"includeSpam");
      if(b)prefBranch.setIntPref(prefStr+"includeSpam",2);
    }catch(e){}
    ///////////////////////////////////////
    try{
      o.includeSpam=prefBranch.getIntPref(prefStr+"includeSpam");
    }catch(e){}
    try{
      o.showFolders=prefBranch.getBoolPref(prefStr+"showFolders");
    }catch(e){}
    try{
      o.autoOpen=prefBranch.getBoolPref(prefStr+"autoOpen");
    }catch(e){}
    try{
      o.alias=prefBranch.getComplexValue(prefStr+"alias",Components.interfaces.nsISupportsString).data;
    }catch(e){}
    try{
      o.link=prefBranch.getComplexValue(prefStr+"link",Components.interfaces.nsISupportsString).data;
    }catch(e){}
    try{
      o.interval=prefBranch.getIntPref(prefStr+"interval");
    }catch(e){}
    try{
      o.order=prefBranch.getIntPref(prefStr+"order");
    }catch(e){}
  }
}
function _addAcount(host,user,passwd,byUser){//add new account (user, import)
  user=getFullUsername(host,user);
  var i=getIndex(host,user);
  if(i<0){//new account
    var o={};
    o.id=host;
    o.user=user;
    o.password=passwd;
    _getValues(o,true,byUser);
    addItem(o);
    checkDefault();
  }else{//account exists.
    if(byUser)return user;
    var n={};
    n.id=host;
    n.user=user;
    n.password=passwd;
    _getValues(n,false,byUser);
    delete n.isNew;
    var o=arAccounts[i];
    var same=true;
    for(var i in n){
      if(n[i]!=o[i]){
        same=false;
        break;
      }
    }
    if(same)return user;
    for(var i in n)o[i]=n[i];
    o.isNew=true;
    var obj=document.getElementById("en"+o.key);
    if(obj)obj.setAttribute("checked",o.enabled?true:false);
  }
  accountsChanged=true;
  return user;
}
function addItem(o){//add item in the list
  var key=keyNum++;
  o.key=key;
  arAccounts.push(o);

  var obj = document.createElement("listitem");
  obj.id=key;
  obj.setAttribute("allowevents","true");
    var ch = document.createElement("listcell");
      var ch1 = document.createElement("vbox");
      ch1.setAttribute("flex","1");
      ch1.setAttribute("align","center");
        var ch2 = document.createElement("checkbox");
        ch2.key=key;
        ch2.setAttribute("id","en"+key);
        ch2.setAttribute("checked",o.enabled?true:false);
        ch2.addEventListener("click",function(){setEnabled(this.checked,this.key);},false);
        ch1.appendChild(ch2);
      ch.appendChild(ch1);
    obj.appendChild(ch);
    ch = document.createElement("listcell");
    ch.setAttribute("label",appMain.getHostName(o.id));
    obj.appendChild(ch);
    ch = document.createElement("listcell");
    ch.setAttribute("label",o.user);
    obj.appendChild(ch);
    ch = document.createElement("listcell");
      var ch1 = document.createElement("vbox");
      ch1.setAttribute("flex","1");
      ch1.setAttribute("align","center");
        var ch2 = document.createElement("checkbox");
        ch2.key=key;
        ch2.setAttribute("id","is-default"+key);
        ch2.addEventListener("click",function(){setDefault(this.key);},false);
        ch1.appendChild(ch2);
      ch.appendChild(ch1);
    obj.appendChild(ch);
  document.getElementById("xnotifier-accounts").appendChild(obj);
}
function onPwdKeydown(e,val){
  if(e.keyCode==13){
    onAdd();
    e.preventDefault();
  }
}
function setValue(name,val){
  if(current){
    current[name]=val;
    current.isNew=true;
    accountsChanged=true;
  }
}
function setColor(em){
  var def;
  if(current){
    def=appMain.getScriptVal(current.id,"defaultInterval");
    if(def==null)def=document.getElementById("updateInterval").value;
  }else{
    def=document.getElementById("updateInterval").value;
  }
  if(em.value==def)em.style.color="grey";
  else em.style.color="";
}
function onDelete(){
  var obj=document.getElementById("xnotifier-accounts");
  var index=obj.selectedIndex;
  if(index<0)return;
  var o=arAccounts[index];
  arDeleted.push(o);
  obj.removeItemAt(index);
  arAccounts.splice(index,1);
  for(var i=0;i<arAccounts.length;i++){
    var o=arAccounts[i];
    if(o.order!=null)o.order=i;
  }
  if(arDefault[o.id]==o.user){
    arDefault[o.id]=null;
    checkDefault();
  }
  if(index==arAccounts.length)--index;
  obj.selectedIndex=index;
  accountsChanged=true;
}
function onImport(){
  var fp = Components.classes["@mozilla.org/filepicker;1"]
  	           .createInstance(Ci.nsIFilePicker);
  fp.init(window, "Import",Ci.nsIFilePicker.modeOpen);
  fp.appendFilter ("X-notifier data","*.xn");
  fp.appendFilters(Ci.nsIFilePicker.filterAll);
  var rv = fp.show();
  if (rv == Ci.nsIFilePicker.returnOK)
  {
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                          .getService(Components.interfaces.nsIPromptService);
    var param = {value: null};
    var result = prompts.promptPassword(null, getString("importPromptTitle"), getString("importPromptText"),param,null,{});
    if(!param.value)return;

    var file=fp.file;
    var str=appMain.loadFile0(file).replace(/\r\n/g,"\n");

    var re=/\[---(.+?)---\]\n([\s\S]+?)\n(?=\[--)/g;
    var o;
    while ((o = re.exec(str)) != null){
      if(o[1]=="<info>"){
        var p=AesCtr.decrypt(o[2],param.value,256);
        if(p!=p.match(/\d+/)){
          prompts.alert(null, getString("importPromptTitle"), getString("importWrongPassword"));
          return;
        }
      }else if(o[1]=="<accounts>"){
        var ar=o[2].split("\n");
        for(var t of ar){
          t=AesCtr.decrypt(t,param.value,256);
          var ac=t.split("\t");
          _addAcount(ac[0],ac[1],ac[2]);
        }
      }else if(o[1]=="<preferences>"){
        var ar=o[2].split("\n");
        for(var t of ar){
          var val=t.split("\t");
          var nm=val[0];
          if(nm=="soundUrl"&&nm.indexOf("://")==-1)continue;
          if(nm=="soundData")continue;
          if(nm=="notificationTime")continue;
          nm="extensions.xnotifier."+nm;
          switch(parseInt(val[1])){
          case 0:
            var s = Components.classes["@mozilla.org/supports-string;1"]
                    .createInstance(Components.interfaces.nsISupportsString);
            s.data = val[2];
            prefBranch.setComplexValue(nm,Components.interfaces.nsISupportsString, s);
            break;
          case 1:
            prefBranch.setIntPref(nm,val[2]);
            break;
          case 2:
            prefBranch.setBoolPref(nm,val[2]=="true");
            break;
          }
        }
        prefService.savePrefFile(null);
        _loadDefault();
      }else{
        main.addScript(o[1],o[2]);
      }
    }
    checkDefault();
  }
}
function onExport(){
  var fp = Components.classes["@mozilla.org/filepicker;1"]
  	           .createInstance(Ci.nsIFilePicker);
  fp.init(window, "Export",Ci.nsIFilePicker.modeSave);
  fp.defaultString="firefox.xn";
  fp.defaultExtension="xn";
  fp.appendFilter ("X-notifier data","*.xn");
  fp.appendFilters(Ci.nsIFilePicker.filterAll);
  var rv = fp.show();
  if (rv == Ci.nsIFilePicker.returnOK||rv == Ci.nsIFilePicker.returnReplace)
  {
    var params = {out:null};
    var features = "chrome,titlebar,toolbar,centerscreen,modal";
    window.openDialog("chrome://xnotifier/content/passwddlg.xul","",features,params).focus();
    if(!params.out||!params.out.value)return;

    var file=fp.file;
    var str="[---<info>---]\r\n";
    var token=Math.random().toString().substring(2);
    str+=AesCtr.encrypt(token,params.out.value,256)+"\r\n";
    var ar=appMain.getScriptList({});
    for(var o of ar){
      str+="[---"+o+"---]\r\n";
      str+=appMain.loadFile("xnotifier/"+o+".js")+"\r\n";
    }

    str+="[---<preferences>---]\r\n";
    var ar=prefBranch.getChildList("extensions.xnotifier.",{});
    for(var o of ar){
      var type=prefBranch.getPrefType(o);
      var nm=o.replace(/^extensions.xnotifier./,"");
      if(nm=="version")continue;
      if(nm=="countTotal")continue;
      if(nm.match(/^accounts\.\[(yahoo|gmail)#\S+?\]\.cookie$/)){
        continue;
      }
      switch(type){
      case Ci.nsIPrefBranch.PREF_STRING:
        str+=nm+"\t0\t"+prefBranch.getComplexValue(o,Components.interfaces.nsISupportsString).data+"\r\n";
        break;
      case Ci.nsIPrefBranch.PREF_INT:
        str+=nm+"\t1\t"+prefBranch.getIntPref(o)+"\r\n";
        break;
      case Ci.nsIPrefBranch.PREF_BOOL:
        str+=nm+"\t2\t"+prefBranch.getBoolPref(o)+"\r\n";
        break;
      }
    }
    str+="[---<accounts>---]\r\n";
    var n=appMain.getAccountsNumber();
    for(var i=0;i<n;i++){
      var o=appMain.getAccountInfo(i);
      str+=AesCtr.encrypt(o.id+"\t"+o.user+"\t"+o.password+"\t"+token,params.out.value,256)+"\r\n";
    }
    str+="[------]";
    appMain.saveFile0(file,str);
  }
}
function checkIsNew(){
  var user=document.getElementById("username").value;
  if(!user){
    current=null;
    return;
  }
  var host=document.getElementById("xnotifier-hosts").value;
  var server=document.getElementById("server").value;
  if(server)user+="|"+server;
  var n=getIndex(host,user);
  current=n<0?null:arAccounts[n];
  setAddMode(n<0);
}
function setAddMode(isNew){
  document.getElementById("btn-add").disabled=!isNew;
  document.getElementById("btn-delete").disabled=isNew;
}
function customizeAdvancedView(){
    var host=document.getElementById("xnotifier-hosts").value;
    var isGmail=(host=="gmail");
    document.getElementById("inbox-only").disabled=!appMain.getScriptVal(host,"supportInboxOnly");
    document.getElementById("include-spam").disabled=!appMain.getScriptVal(host,"supportIncludeSpam");
    document.getElementById("show-folders").disabled=!appMain.getScriptVal(host,"supportShowFolders");
    document.getElementById("show-folders").label=document.getElementById(isGmail?"lb-show-labels":"lb-show-folders").value;
    document.getElementById("yahoo").collapsed=host!="yahoo";
    var locale=appMain.getScriptVal(host,"needLocale");
    document.getElementById("server-box").collapsed=!appMain.getScriptVal(host,"needServer")&&!locale;
    if(!appMain.getScriptVal(host,"needServer")&&!locale)document.getElementById("server").value="";
    document.getElementById("link-box").collapsed=!appMain.getScriptVal(host,"needLink");
    if(!appMain.getScriptVal(host,"needLink"))document.getElementById("link").value="";
    //document.getElementById("auto-open").disabled=appMain.getScriptVal(host,"notSupportAutoOpen");
    document.getElementById("lb-server").collapsed=locale;
    document.getElementById("lb-locale").collapsed=!locale;
    var isRSS=(host=="rss");
    document.getElementById("lb-username").collapsed=isRSS;
    document.getElementById("lb-url").collapsed=!isRSS;
    document.getElementById("pwd-box").collapsed=isRSS;
    if(current==null){
      var def=appMain.getScriptVal(host,"defaultInterval");
      document.getElementById("interval").value=def!=null?def:document.getElementById("updateInterval").value;
    }
}
function toggleSubitem(parent,child){
  document.getElementById(child).disabled=!document.getElementById(parent).checked;
}
function showAdvancedSound(){
  document.documentElement
          .openSubDialog("chrome://xnotifier/content/notifications.xul",
                          "", null);
}
function onKeyDown(ev){
  if(ev.keyCode==46)onDelete();
}
function checkMasterPasswords() {
  var tokendb = Components.classes["@mozilla.org/security/pk11tokendb;1"]
                    .createInstance(Ci.nsIPK11TokenDB);
  var token = tokendb.getInternalKeyToken();

  // There is no master password
  if (token.checkPassword(""))return true;

  // So there's a master password. But since checkPassword didn't succeed, we're logged out (per nsIPK11Token.idl).
  try {
    // Relogin and ask for the master password.
    token.login(true);  // 'true' means always prompt for token password. User will be prompted until
                        // clicking 'Cancel' or entering the correct password.
  } catch (e) {
    // An exception will be thrown if the user cancels the login prompt dialog.
    // User is also logged out of Software Security Device.
  }
  return token.isLoggedIn();
}

function onMove(d){
  if(current){
    var list=document.getElementById("xnotifier-accounts");
    var em=document.getElementById(current.key);
    var index=list.getIndexOfItem(em);
    var to=(current.order==null?index:current.order)+d;
    if(to<0||to>=arAccounts.length)return;
    current.order=to;
    arAccounts.splice(index,1);
    arAccounts.splice(to,0,current);
    for(var i=0;i<arAccounts.length;i++){
      var o=arAccounts[i];
      if(o.order!=null||o.isNew)o.order=i;
    }
    list.removeChild(em);
    list.insertBefore(em,list.getItemAtIndex(to));
    list.selectedItem=em;
    accountsChanged=true;
  }
}

var main={
  hostDeleted:false,
  addHost:function(hostID,inList,needReload){
    if(needReload)accountsChanged=true;//do reload
    if(!inList){
      var s=appMain.getHostName(hostID);
      if(s!=null){
        var obj=document.getElementById("xnotifier-hosts");
        obj.appendItem(s,hostID);
      }
    }
  },
  removeHost:function(hostID){
    delete arDefault[hostID];
    var em=document.getElementById("xnotifier-hosts");
    var list=em.firstChild.childNodes;
    for(var i=0;i<list.length;i++){
      var o=list[i];
      if(o.getAttribute("value")==hostID){
        em.removeItemAt(i);
        em.selectedIndex=0;
        break;
      }
    }
    var obj=document.getElementById("xnotifier-accounts");
    for(var i=0;i<arAccounts.length;i++){
      var o=arAccounts[i];
      if(o.id==hostID){
        obj.removeItemAt(i);
        arAccounts.splice(i,1);
        --i;
        this.hostDeleted=true;
      }
    }
    for(var i=0;i<arDeleted.length;i++){//check arDeleted also.
      var o=arDeleted[i];
      if(o.id==hostID){
        arDeleted.splice(i,1);
        --i;
        this.hostDeleted=true;
      }
    }
  },
  showScripts:function(){
    document.documentElement
            .openSubDialog("chrome://xnotifier/content/pref-script.xul",
                            "", this);
  },
  addScript:function(fname,str){
    var isInstalled=appMain.isInstalled(fname);
    appMain.saveFile("xnotifier/"+fname+".js",str);
    var needReload=appMain.addScript(fname);
    if(fname.indexOf("lib-")!=0){
      this.addHost(fname,isInstalled,needReload);
    }
    return isInstalled;
  }
}
