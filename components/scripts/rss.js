/***********************************************************
  @require lib-update.js
***********************************************************/
var name="RSS";
var supportMulti=true;
var noCookie=true;
var needLink=true;

function init(){
  initUpdateHandler(this);
  this.dataURL=this.user;
  this.viewURL=this.link?this.link:this.user;
  this.getViewURL=function(){
    this.wuCheckUpdate();
    if(!this.link){
      var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Ci.nsIPrefService);
      var branch=prefService.getBranch("browser.feeds.");
      if(branch.getCharPref("handler")=="reader"&&
        branch.getCharPref("handler.default")=="web"&&
        branch.getCharPref("handlers.webservice")=="chrome://xnotifier/content/addfeed.xul?url=%s")
        branch.setCharPref("handler","ask");
    }
    return this.viewURL;
  }
}
function getIconURL(){
  return "chrome://browser/skin/page-livemarks.png";
}
function getIconPage(){
  return null;
}
function findString(aData){
  if(this.keyword){
    /*var ar=this.keyword.split(",");
    var s="";
    for(var i=0;i<ar.length;i++){
      if(i>0)s+="|";
      s+="(\\b|\\W)"+ar[i]+"(\\b|$|\\W)";
    }*/
    var p1="(\\b|\\W)";
    var p2="(\\b|$|\\W)";
    var s=p1+this.keyword.replace(/,/g,p1+"|"+p2)+p2;
    var fnd=aData.match(new RegExp(s,"gm"));
    return ""+(fnd?fnd.length:0);
  }
  aData=aData.replace(/<lastBuildDate>[\S\s]+?<\/lastBuildDate>/,"")
          .replace(/<pubDate>[\S\s]+?<\/pubDate>/g,"")
          .replace(/<updated>[\S\s]+?<\/updated>/g,"")
          .replace(/<!--[\S\s]+?-->/g,"")
          .replace(/<slash:comments>[\S\s]+?<\/slash:comments>/g,"")
          .replace(/<content:encoded>[\S\s]+?<\/content:encoded>/g,"");
  return aData;
}
