/***********************************************************
AOL
***********************************************************/
var supportInboxOnly=true;
var supportShowFolders=true;
var supportIncludeSpam=true;
var needLocale=true;

function init(){
  this.initStage=ST_PRE;
  this.loginData=["https://my.screenname.aol.com/_cqr/login/login.psp"];
  this.dataURL="https://mail.aol.com/";
  this.viewURL="https://mail.aol.com/";
  this.viewDomain="mail.aol.com";
  if(this.server)this.server=this.server.replace(/\s/g,"");
  if(this.server){
    var ar=this.server.split("-");
    if(ar.length==2){
      this.lang=ar[0];
      this.locale=ar[1];
    }else{
      this.lang=this.server;
      this.locale=this.server;
    }
  }else{
    this.lang="en";
    this.locale="us";
  }
  this.lang=this.lang.toLowerCase();
  this.logoutURL="https://my.screenname.aol.com/_cqr/logout/mcLogout.psp";
  this.cookieDomain="aol.com";
}

function getIconURL(){
  return "https://s.aolcdn.com/cdn.mail.aol.com/webmail/160512.1401/aol/en-us/images/favicon.ico";
}

function getData(aData){
  var obj={};

  var num=0;
  var found=false;
  var l;
  try{
    l=JSON.parse(aData)[0];
  }catch(e){
    this.count=-1;
    return obj;
  }
  if(!l.folders){
    this.count=-1;
    return obj;
  }

  var ar=[];

  for(var i=0;i<l.folders.length;i++){
    var o=l.folders[i];
    var fid=o[0];
    if(fid=="Drafts")continue;
    if(fid=="Sent")continue;
    if(fid=="Deleted")continue;
    if(fid=="Saved")continue;
    if(fid=="SavedIMs")continue;
    var n=o[6];
    if(fid=="Spam"){
      if(n>0&&this.includeSpam){
        ar.push({id:fid,title:o[1],count:n});
        if(this.includeSpam==2)num+=n;
      }
      continue;
    }else if(fid=="Inbox"||fid=="NewMail"||!this.inboxOnly)num+=n;
    if(n>0&&fid!="Inbox"&&fid!="NewMail"){
      var t={id:fid,title:o[1],count:n};
      ar.push(t);
    }
    found=true;
  }
  if(found){
    this.count=num;
    if(this.showFolders){
      if(ar)obj.folders=ar;
    }
    return obj;
  }
  this.count=-1;
  return obj;
}
function process(aData,aHttp) {
if(this.debug)dlog(this.id+"\t"+this.user+"\t"+this.stage,aData);
  switch(this.stage){
  case ST_PRE:
    /*if(this.lang=="fr")this.getHtml("https://mail.aol.fr");
    else if(this.lang=="de")this.getHtml("https://mail.aol.de");
    else if(this.lang=="jp")this.getHtml("https://mail.aol.jp");
    else this.getHtml("https://mail.aol.com");*/
    this.getHtml("https://my.screenname.aol.com/_cqr/login/login.psp?sitedomain=sns.mail.aol.com&lang="+this.lang+"&locale="+this.locale);
    return false;
  case ST_PRE_RES:
    var reg=new RegExp("<form.+name\\s*=\\s*[\"\']AOLLoginForm[\"\']([\\S\\s]+?)<script");
    var s=aData.match(reg);
    if(s){
      this.loginData[LOGIN_DATA]=this.getForm(s[1]);
    }
    this.stage=ST_LOGIN;
  case ST_LOGIN:
    var user=this.user.split("|")[0];
    var ar=user.split("@");
    if(ar[1]=="aol.com" || ar[1] =="aim.com" || ar[1]=="netscape.net" || ar[1] =="aol.fr" || ar[1] =="aol.de" || ar[1] =="cs.com" || ar[1]=="aol.co.uk") {
      user=ar[0];
    }
    this.loginData[LOGIN_POST]="loginId="+encodeURIComponent(user)
                                +"&password="+encodeURIComponent(this.password);
    this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]+"&"+this.loginData[LOGIN_DATA]);
    return false;
  case ST_LOGIN_RES:
    var fnd=aData.match(/userId\s*=\s*"(\S+?)"/);
    if(fnd){
      this.dataURL=["https://mail.aol.com/webmail/rpc/v1/en-us?transport=xmlhttp&user="+fnd[1]+"&a=GetMessageList",
          "requests="+encodeURIComponent('[{"folder":"Inbox","start":0,"count":100,"indexStart":0,"indexMax":100,"index":true,"info":true,"rows":true,"sort":"received","tcs":false,"sortDir":"descending","search":"false","searchIn":"seen","subSearch":"","seen":[],"returnfoldername":true,"import":false,"action":"GetMessageList"}]"')+"&automatic=false"];
    this.stage=ST_DATA;
    }else{
      this.onError();
      return true;
    }
  case ST_DATA:
    this.getHtml(this.dataURL[0],this.dataURL[1]);
    return false;
  }
  return this.baseProcess(aData,aHttp);
}
