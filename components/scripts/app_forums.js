/***********************************************************
XN-forums
  @require lib-update.js
***********************************************************/
var name="XN-forums";
var defaultInterval=120;

function init(){
  initUpdateHandler(this);
  if(this.user=="default"){
    this.noCookie=true;
  }else{
    this.initStage=ST_LOGIN;
    this.loginData=["http://xnotifier.tobwithu.com/dp/forum?destination=forum","name","pass","op=Log+in&form_id=user_login_block"];
  }

  this.dataURL="http://xnotifier.tobwithu.com/dp/forum/";
  this.viewURL="http://xnotifier.tobwithu.com/dp/"+(this.user=="default"?"forum/1":"tracker");
  this.viewDomain="xnotifier.tobwithu.com";
  this.start="<div id=\"forum\">[\\s\\S]+?<tbody>";
  this.end="<\/tbody>";
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
