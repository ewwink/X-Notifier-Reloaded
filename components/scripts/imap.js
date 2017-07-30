/**********************************************************
IMAP
**********************************************************/
var name="IMAP";
var supportInboxOnly=true;
var supportShowFolders=true;
var needServer=true;
var needLink=true;

function init(){
  this.initStage=ST_DATA;
  if(!this.server&&this.user.indexOf("@")!=-1)this.server="imap."+this.user.split("@")[1];
  this.seq=0;
}
function processSocket(aData){
if(this.debug)dlog(this.id+"\t"+this.user+"\t"+this.stage,aData);
  if(aData.match(/ OK/)||aData.match(/ NO/)||aData.match(/ BAD/)||aData.indexOf("* ")==0){
    if(this.atom){
      var fnd=aData.match(new RegExp(this.atom));
      this.pdata+=aData;
      if(fnd){
        if(!this.process(this.pdata))++this.stage;
      }
    }else if(!this.process(aData))++this.stage;
  }else{
    this.onError();
  }
}
function process(aData,aHttp) {
  switch(this.stage){
  case ST_DATA:
    var ar=this.server.split(":");
    var port=ar[1]?ar[1]:993;
    this.atom=null;
    this.sock=new SocketReader(this,ar[0],port,port==993);
    return false;
  case ST_DATA+1:
    var user;
    if(this.user.indexOf("|")!=-1)user=this.user.split("|")[0];
    else user=this.user.split("@")[0];
    this.send("LOGIN "+user+" "+this.password);
    return false;
  case ST_DATA+2:
    if(aData.match(/ OK/)){
      this.send("LSUB \"\" \"*\"");
      return false;
    }
    break;
  case ST_DATA+3:
    var re=/LSUB \((.*?)\) ".*" (.+)/g;
    var o;
    this.folders=[];
    while ((o = re.exec(aData)) != null){
      var f=o[2].match(/^"(.+)"$/);
      if(f)f=f[1];
      else f=o[2];
      if(!f.match(/^INBOX$/i)&&o[1].indexOf("\Noselect")==-1){
        this.folders.push(f);
      }
    }
    this.inboxDone=false;
    this.newData=0;
    this.folderAr=[];
    this.send("SELECT \"INBOX\"");
    return false;
  case ST_DATA+4:
    this.send("SEARCH UNSEEN");
    return false;
  case ST_DATA+5:
    var fnd=aData.match(/\* SEARCH ?(.*)$/m);
    var n=0;
    if(fnd) n=fnd[1]?fnd[1].trim().split(" ").length:0;
	if(this.inboxOnly){
      if(!this.inboxDone){
        this.newData=n;
      }
    }else{
      this.newData+=n;
    }
    if(this.inboxDone&&n>0){
      this.folderAr.push({id:this.curFolder,count:n});
    }
    if(!this.inboxDone)this.inboxDone=true;

    if(this.folders.length>0){
      var folder=this.folders.pop(); 
      var name=this.decodeMUTF7(folder);
      var fnd=name.match(/^INBOX[\/\.](.+)/i);
      if(fnd)name=fnd[1];
      this.curFolder=name;
      this.send("SELECT \""+folder+"\"");
      this.stage-=1;
      return true;
    }
    var cnt=this.main.wuGetVal(this.id,this.user,0);
    cnt=cnt?parseInt(cnt):0;
    var num=this.newData;
    if(num>=cnt){
      this.count=num-cnt;
    }else{
      this.main.wuSetVal(this.id,this.user,0,num);
      this.count=0;
    }
    this.data=this.getData(aData);
    if(this.showFolders){
      if(this.folderAr)this.data.folders=this.folderAr;
    }
    delete this.folderAr;
    this.data.desc=this.getDesc();

    this.send("LOGOUT");
    return false;
  case ST_DATA+6:
    this.sock.close();
    if(this.count<0){
		this.reset();
    }else this.stage=ST_DATA;
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
  ++this.seq;
  var s=this.seq.toString();
  while(s.length<3)s="0"+s;
  if(s.length>3)s=s.substring(0,3);
  this.atom="A"+s;
  this.pdata="";
  this.sock.write(this.atom+" "+cmd+"\r\n");
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
function decodeMUTF7(str){
  function decodeBase64(str){
    var s=atob(str);
    var rs="";
    for(var i=0;i<s.length;i+=2){
      var c1=s.charCodeAt(i);
      var c2=s.charCodeAt(i+1);
      rs+=String.fromCharCode((c1<<8)|c2);
    }
    return rs;
  }
  return str.replace(/&(\S*?)-/g,function(){return RegExp.$1?decodeBase64(RegExp.$1.replace(/,/g,"/")):"&"});
}