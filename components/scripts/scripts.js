/***********************************************************
XN-scripts
***********************************************************/
var name="XN-scripts";
var defaultInterval=1440;

function init(){
  this.initStage=ST_DATA;
  this.dataURL="http://xnotifier.tobwithu.com/script_check.php";
  this.viewURL="http://xnotifier.tobwithu.com/script_update.php";
}
function getViewURL(aFolder){
  return [this.viewURL,this.post];
}
function getCount(aData){
  var fnd=aData.match(/n:(\d+)/);
  return fnd?fnd[1]:-1;
}
function process(aData,aHttp) {
  switch(this.stage){
  case ST_DATA:
    this.stage=ST_DATA_RES+1
    this.getScriptList();
    return true;
  case ST_DATA_RES+1:
    this.post="list="+encodeURIComponent(aData);
    this.stage=ST_DATA_RES;
    this.getHtml(this.dataURL,this.post);
    return true;
  }
  return this.baseProcess(aData,aHttp);
}
