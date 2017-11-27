/***********************************************************
Yahoo
***********************************************************/
 var supportInboxOnly=true;
 var supportShowFolders=true;
 var supportIncludeSpam=true;

function init(){
  this.initStage=ST_PRE;
  var ar=this.user.split("@");
  if(ar[1]=="yahoo.co.jp"){
    this.loginData=["https://login.yahoo.co.jp/config/login?",
                        "","passwd","login="+encodeURIComponent(ar[0])];
    this.dataURL="http://mail.yahoo.co.jp/";
    this.viewURL="http://mail.yahoo.co.jp/";
    this.viewDomain="mail.yahoo.co.jp";
    this.domain="yahoo.co.jp";
    this.loginData[3]+="&.persistent=y";
    this.cookieDomain="yahoo.co.jp";
    this.logoutURL="http://login.yahoo.co.jp/config/login?logout=1";
  }else{
    this.loginData=["","username","password","verifyPassword=Sign+in"];
    this.dataURL="https://mail.yahoo.com/";
    this.viewURL="https://mail.yahoo.com/";
    this.viewDomain="mail.yahoo.com";
    this.domain="yahoo.com";
    this.cookieDomain="yahoo.com";
    this.logoutURL="https://login.yahoo.com/account/logout?logout=1";
  }
  this.mode=-1;
}
function checkLogin(aData){
  switch(this.stage){
  case ST_CHECK:
    if(this.cookies){
      this.stage=ST_DATA;
      this.setCookies();
      return true;
    }
    this.getHtml(this.viewURL);
    return false;
  case ST_CHECK+1:
    var fnd=aData.match(/\/account\/logout\?logout/);    
    var fnd2=aData.match(/\/config\/login\?logout/);
    if(fnd||fnd2){
      if(this.isLoggedIn(aData)){//logged in already
        this.stage=ST_DATA;
        return this.process(aData);
      }
    }
    this.cookieManager.clear();//clear cookies because 'F' is saved
    this.stage=this.initStage;
    this.getHtml(this.logoutURL);
    return true;
  }
  this.onError();
  return true;
}
function isLoggedIn(aData){
  if(aData.match(new RegExp("\"yid\":\""+this.user+"\"","i")))return true;//mode 3
  if(aData.match(new RegExp("\"accounts\".+?\"email\":\""+this.user+"\"","i")))return true;//mode 3
  if(aData.match(new RegExp("loginId:\""+this.user+"\"","i")))return true;//mode 2
  if(aData.match(new RegExp("\"defaultID\":\""+this.user+"\"","i")))return true;
  if(aData.match(new RegExp("\"loggedInAlias\":\""+this.user+"\"","i")))return true;
  if(aData.match(new RegExp("class=\"uh-name\"\\s+title=\""+this.user+"\"","i")))return true;//basic mode
  if(aData.match(new RegExp("class=\"uh-name\"\\s+title=\""+this.user+"@yahoo\.","i")))return true;//basic mode
  if(aData.match(new RegExp("\"jptoppimemail\">"+this.user,"i")))return true; //yahoo japan old
  return false;
}
function process(aData,aHttp){
if(this.debug)dlog(this.id+"\t"+this.user+"\t"+this.stage,aData);
  switch(this.stage){
  case ST_PRE:
    if(this.domain=="yahoo.co.jp"){
      this.stage=ST_PRE+10;
      this.getHtml(this.viewURL);//set cookie for login
      return true;
    }else{
// vs 3 cookieManager code
      var done=false;
      try{
        var s=this.main.prefBranch.getCharPref("accounts.["+this.id+"#"+this.user+"].cookie");
        s=s.split("\t");
        this.cookieManager.addCookies(s[0],s[1]);
        done=true;
      }catch(e){}
      if(!done){
        var ck=this.getCookieString(this.domain,"F");
        if(ck){
          this.cookieManager.addCookies("http://login."+this.domain,ck);
        }
      }

      done=false;
      try{
        var s=this.main.prefBranch.getCharPref("accounts.["+this.id+"#"+this.user+"].cookie2");
        s=s.split("\t");
        this.cookieManager.addCookies(s[0],s[1]);
        done=true;
      }catch(e){}
      if(!done){
        var ck=this.getCookieString(this.domain,"FS");
        if(ck){
          this.cookieManager.addCookies("http://login."+this.domain,ck);
        }
      }
// END vs 3 cookieManager code
      this.getHtml("https://login.yahoo.com/?display=login&done=https%3A%2F%2Fmail.yahoo.com%2F&prefill=0&add=1");
      return false;
    }
  case ST_PRE+1:
    var post=this.getForm(aData,"login-username-form");
    if(post){
      this.getHtml("https://login.yahoo.com/?display=login&done=https%3A%2F%2Fmail.yahoo.com%2F&prefill=0&&add=1",
        "username="+this.user+"&"+post,{"X-Requested-With":"XMLHttpRequest"});
      return false;
    }
    break;
  case ST_PRE+2:
    var fnd=aData.match(/"location":"(\S+?)"/);
    if(fnd){
      this.loginData[LOGIN_URL]=fnd[1];
      this.stage=ST_LOGIN;
      this.getHtml(fnd[1]);
      return true;
    }
    break;    
  case ST_PRE+10://yahoo.co.jp
    var fnd=aData.match(/\(".albatross"\)\[0\].value\s*=\s*"(\S+?)"/);
    if(fnd)this.albatross="&.albatross="+encodeURIComponent(fnd[1]);
    this.stage=ST_LOGIN;
    this.delay(4000);
    return true;
  case ST_LOGIN:
    if(this.albatross){//yahoo.co.jp
      this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]+this.albatross);
      delete this.albatross;
      return false;
    }
    var post=this.getForm(aData);
    if(post){
      this.post=post;
      this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]+"&"+post);
      return false;
    }
    break;
  }
  return this.baseProcess(aData,aHttp);
}

function getData(aData){
  var obj={};
  var ar=[];
  this.count=-1;
  if(!this.isLoggedIn(aData))return obj;

  if(this.mode==-1||this.mode==3){
    fnd=aData.match(/,"folders":{[\s\S]+?},"mailboxes"/);
    if(fnd)this.mode=3;
    else this.mode=-1;
  }  
  if(this.mode==-1||this.mode==2){
    fnd=aData.match(/\.folders\s*?=\s*?({[\s\S]+?});/);
    if(fnd)this.mode=2;
    else this.mode=-1;
  }
  if(this.mode==-1||this.mode==1){//original mode (yahoo.co.jp)
    fnd=aData.match(/<div.+?folderlist.+?>([\s\S]+?)<\/ol>/);
    if(fnd)this.mode=1;
    else this.mode=-1;
  }
  if(this.mode==-1||this.mode==0){
    fnd=aData.match(/<ul\s+class="folders">([\S\s]+?)<\/ul>/);
    if(fnd)this.mode=0;
    else this.mode=-1;
  }
  if(this.mode==3){
    fnd=aData.match(/,"folders":({[\s\S]+?}),"mailboxes"/);
    var num=0;
    try{
      var l=JSON.parse(fnd[1]);     
      for(var i in l){
        var o=l[i];       
        var fid=o.types[0];
        if(!this.includeSpam&&fid=="BULK")continue;
        if(fid=="CHATS")continue;
        if(fid=="DRAFT")continue;
        if(fid=="SENT")continue;
        if(fid=="TRASH")continue;
        if(o.types.indexOf("INVISIBLE")!=-1)continue;    
        var n=o.unread;
        if(fid=="BULK"){
          if(this.includeSpam==2)num+=n;
        }else if(this.inboxOnly){
            if(fid=="INBOX")num+=n;
        }else num+=n;
        if(n>0&&fid!="INBOX"){
          ar.push({id:o.id,title:o.name,count:n});
        }
      }
    }catch(e){}
    this.count=num;
    if(this.showFolders){
      if(ar)obj.folders=ar;
    }
    return obj;  
  }
  if(this.mode==2){
    if(this.includeSpam&&this.spamName==null){
      var fnd2=aData.match(/str_nav_spam\s*:\s*"(.+?)"/);
      if(fnd2)this.spamName=fnd2[1];
      else this.spamName="Spam";
    }
    var num=0;
    try{
      var l=JSON.parse(fnd[1]).folder;
      for(var i=0;i<l.length;i++){
        var o=l[i];
        var fid=o.folderInfo.fid;
        if(!this.includeSpam&&fid=="%40B%40Bulk")continue;
        if(fid=="%40C%40Chats")continue;
        if(fid=="Draft")continue;
        if(fid=="Sent")continue;
        if(fid=="Trash")continue;
        var n=o.unread;
        if(fid=="%40B%40Bulk"){
          if(this.includeSpam==2)num+=n;
        }else if(this.inboxOnly){
          if(fid=="Inbox")num+=n;
        }else num+=n;
        if(n>0&&fid!="Inbox"){
          var fn=fid=="%40B%40Bulk"?this.spamName:unescape(o.folderInfo.name.replace(/\\u/g,"%u"));
          ar.push({id:fid,title:fn,count:n});
        }
      }
    }catch(e){}
    this.count=num;
    if(this.showFolders){
      if(ar)obj.folders=ar;
    }
    return obj;
  }else if(this.mode==1||this.mode==0){
    fnd=fnd[1];
    if(this.mode==1&&(!this.inboxOnly||this.showFolders)){
      var fnd2=aData.match(/<div\s+id="customfolders">([\s\S]+?)<\/ol>/);
      if(fnd2){
        fnd+=fnd2[1];
      }
    }
    fnd=fnd.match(/<li .+?<\/a>/g);
    if(fnd){
      var s;
      var num=0;
      for(var i=0;i<fnd.length;i++){
        s=fnd[i].replace(/<wbr>/g,"");
        var t=s.match(/li\s+id=\"(.+?)\".+?<a.+?>(?:<em>)?(.+?)(?:\s\S+?(\d+)\S+)?<\/a>/);
        if(t){
          if(!this.includeSpam&&t[1]=="bulk")continue;
          if(t[1]=="draft"||t[1]=="sent"||t[1]=="receipt"||t[1]=="trash")continue;
          var n=0;
          if(t[3])n=parseInt(t[3]);
          if(t[1]=="bulk"){
            if(this.includeSpam==2)num+=n;
          }else if(this.inboxOnly){
            if(t[1]=="inbox")num+=n;
          }else num+=n;
          if(n>0&&t[1]!="inbox"){
            var fid=t[1];
            if(fid.indexOf("%")==0)fid=fid.substring(1,fid.length-1);
            ar.push({id:fid,title:t[2],count:n});
          }
        }
      }
      this.count=num;
      if(this.showFolders){
        if(ar)obj.folders=ar;
      }
      return obj;
    }
  }
  return obj;
}
function getViewURL(aFolder){
  if((this.mode==3)&&aFolder&&this.dataURLCopy){
    var url=this.dataURLCopy+"/folders/"+encodeURIComponent(aFolder);
    return url;
  }
  if((this.mode==2||this.mode==0)&&aFolder&&this.dataURLCopy){
    var url=this.dataURLCopy+"&fid="+encodeURIComponent(aFolder);
    return url;
  }
  if(this.mode==1&&aFolder&&this.dataURLCopy){
    var n=this.dataURLCopy.indexOf("/",7);
    var url=this.dataURLCopy.substring(0,n)
              +"/mc/showFolder?fid="+encodeURIComponent(aFolder);
    return url;
  }
  return this.viewURL;
}
