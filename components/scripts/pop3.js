/**********************************************************
POP3
**********************************************************/
var name="POP3";
var needServer=true;
var needLink=true;

function init(){
  this.initStage=ST_DATA;
  if(!this.server&&this.user.indexOf("@")!=-1)this.server="pop."+this.user.split("@")[1];
}
function processSocket(aData){
  if(aData.indexOf("+OK")==0){
    if(!this.process(aData))++this.stage;
  }else{
    this.onError();
  }
}
function process(aData,aHttp) {
if(this.debug)dlog(this.id+"\t"+this.user+"\t"+this.stage,aData);
  switch(this.stage){
  case ST_DATA:
    var ar=this.server.split(":");
    var port=ar[1]?ar[1]:995;
    this.sock=new SocketReader(this,ar[0],port,port==995);
    return false;
  case ST_DATA+1:
    var user;
    if(this.user.indexOf("|")!=-1)user=this.user.split("|")[0];
    else user=this.user.split("@")[0];
    this.send("USER "+user);
    return false;
  case ST_DATA+2:
    this.send("PASS "+this.password);
    return false;
  case ST_DATA+3:
    this.send("STAT");
    return false;
  case ST_DATA+4:
    var fnd=aData.match(/\+OK\s(\d+)/);
    if(fnd){
      var cnt=this.main.wuGetVal(this.id,this.user,0);
      cnt=cnt?parseInt(cnt):0;
      var num=parseInt(fnd[1]);
      this.newData=num;
      if(num>=cnt){
        this.count=num-cnt;
      }else{
        this.main.wuSetVal(this.id,this.user,0,num);
        this.count=0;
      }
      this.data=this.getData(aData);
      this.data.desc=this.getDesc();
    }
    this.send("QUIT");
    return false;
  case ST_DATA+5:
    this.sock.close();
    if(this.count<0)this.reset();
    else this.stage=ST_DATA;
    this.main.setResult(this);
    return true;
  }
  this.onError();
  return true;
}
function stop(){
  if(this.sock)this.sock.close();
}
function send(cmd){
  this.sock.write(cmd+"\r\n");
}

function calcCount(){
  return this.count;
}
function getViewURL(){
  if(this.newData){
    this.main.wuSetVal(this.id,this.user,0,this.newData);
    delete this.newData;
    this.count=0;
    if(!this.main.resetCounter){
      this.data.desc=this.getDesc();
      this.main.setResult(this);
    }
  }
  return this.link;
}