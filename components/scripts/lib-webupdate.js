/***********************************************************
Library - Web Update

  Notify web site update.

  @ver 0.2
***********************************************************/
var DB_FILE_NAME = "xnotifier/wudata.txt";

Handler.prototype.wuGetVal=function(n){
  return this.main.wuGetVal(this.id,this.user,n);
}
Handler.prototype.wuSetVal=function(n,val){
  this.main.wuSetVal(this.id,this.user,n,val);
}
/**********************************************************/

Main.prototype.loadDBFile=function(name){
  var str=Main.prototype.loadFile(name);
  str=str.split("\r\n");
  var data={};
  for(var i=0;i<str.length-1;i+=2){
    data[str[i]]=str[i+1].replace(/<\\n>/g,"\n").replace(/<\\r>/g,"\r");
  }
  return data;
}

Main.prototype.saveDBFile=function(name,data){
  var str="";
  for(i in data) {
    str+=i+"\r\n";
    var d=data[i];
    if(!d)d="";
    d=d.replace(/\r/g,"<\\r>").replace(/\n/g,"<\\n>");
    str+=d+"\r\n";
  }
  Main.prototype.saveFile(name,str);
}
Main.prototype.wuInit=function(){
  if(!this.fileDB){
    this.fileDB=this.loadDBFile(DB_FILE_NAME);
  }
}
Main.prototype.wuGetVal=function(id,user,num){
  this.wuInit();
  return this.fileDB[id+"\t"+user+"\t"+num];
}
Main.prototype.wuSetVal=function(id,user,num,val){
  this.wuInit();
  this.fileDB[id+"\t"+user+"\t"+num]=val.toString();
  this.saveDBFile(DB_FILE_NAME,this.fileDB);
}
Handler.prototype.wuCompare=function(aData){
  this.main.wuInit();
  var fnd=this.findString(aData);
  if(fnd){
    var key=this.id+"\t"+this.user;
    var db=this.main.fileDB;
    if(db[key+"\t0"]){
      for(var i=0;i<this.cache;++i){
        if(db[key+"\t"+i]==fnd)return 0;
      }
      //no match
      this.newData=fnd;
      return 1;
    }else{
      for(var i=0;i<this.cache;++i){
        db[key+"\t"+i]=fnd;
      }
      this.main.saveDBFile(DB_FILE_NAME,this.main.fileDB);
      return 0;
    }
  }else{
    return -1;
  }
}
Handler.prototype.wuCheckUpdate=function(){
  if(this.newData){
    var db=this.main.fileDB;
    for(var i=this.cache-1;i>0;--i){
      db[this.id+"\t"+this.user+"\t"+i]=db[this.id+"\t"+this.user+"\t"+(i-1)];
    }
    db[this.id+"\t"+this.user+"\t0"]=this.newData;
    this.newData=null;
    this.main.saveDBFile(DB_FILE_NAME,db);
    this.count=0;
    this.data.desc=this.getDesc();
    this.main.setResult(this);
    return true;
  }
  return false;
}

function initUpdateHandler(handler){
  handler.cache=1;
  handler.initStage=ST_DATA;
  handler.start="";
  handler.capture="[\\s\\S]+";
  handler.end="";
  handler.noCounterReset=true;
  handler.getCount=function(aData){
     return this.wuCompare(aData);
  };
  handler.calcCount=function(){
     return this.count;
  };

  handler.getViewURL=function(){
    this.wuCheckUpdate();
    return this.viewURL;
  }

  handler.getDesc = function(){
    var aData=this.count;
    return aData>0?"!":"";
  }
  handler.getData=function(){
    return {desc0:"="};
  }
  if(!handler.findString){
    handler.findString=function(aData){
      var reg=new RegExp(this.start+"("+this.capture+")"+this.end);
      var fnd=aData.match(reg);
      return fnd?fnd[1]:null;
    }
  }
}
