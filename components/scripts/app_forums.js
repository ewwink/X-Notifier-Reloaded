/***********************************************************
XN-forums
  @require lib-update.js
***********************************************************/
var name="XN-forums";
var ver="2018-07-13";
var defaultInterval=120;

function init(){
  initUpdateHandler(this);
  if(this.user=="default"){
    this.noCookie=true;
  }else{
    this.initStage=ST_PRE;
    this.loginData=["http://xnotifier.tobwithu.com/dp/forum?destination=forum","name","pass","op=Log+in&form_id=user_login_block"];
  }

  this.dataURL="http://xnotifier.tobwithu.com/dp/forum/";
  this.viewURL="http://xnotifier.tobwithu.com/dp/"+(this.user=="default"?"forum/2":"tracker");
  this.viewDomain="xnotifier.tobwithu.com";
  this.start="<div id=\"forum\">[\\s\\S]+?<tbody>";
  this.end="<\/tbody>";
}
function process(aData,aHttp) {
if(this.debug)dlog(this.id+"\t"+this.user+"\t"+this.stage,aData);
  switch(this.stage){
  case ST_PRE:
    this.getHtml("http://xnotifier.tobwithu.com/dp/");
    return false;
  case ST_PRE_RES:
    var fnd=aData.match(/id="user-login-form"/);  
    if(fnd){
      this.stage=ST_LOGIN;      
      var fnd2=aData.match(/"antibot".+?"key":"(\S+?)"/);
      if(fnd2){
        this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]+"&antibot_key="+encodeURIComponent(fnd2[1]));
        return false;
      }
    }else this.stage=ST_LOGIN_RES;
  }
  return this.baseProcess(aData,aHttp);
}    
function findString(aData){
  if(this.user!="default"){
    var fnd=aData.match(/<input.+?id="edit-submit".+?value="Log in"/);
    if(fnd)return null;
  }
  var reg=new RegExp(this.start+"([\\s\\S]+?)"+this.end);
  var fnd=aData.match(reg);
  if(fnd){
    fnd=fnd[1].replace(/<span class=\"submitted\">[\s\S]+?<\/td>/g,"");
    fnd=fnd.replace(/(<td class="topics">\s*\d+)\s*<br[\s\S]+?(<\/td>)/g,"$1$2");
    return fnd;
  }
  return null;
}
