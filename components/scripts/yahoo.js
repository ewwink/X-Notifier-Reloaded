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
  }else{
    this.loginData=["https://login.yahoo.com/?.src=ym",
                        "username","passwd",".persistent=y"];
    this.dataURL="https://mail.yahoo.com/";
    this.viewURL="https://mail.yahoo.com/";
    this.viewDomain="mail.yahoo.com";
    this.domain="yahoo.com";
  }
  this.mode=-1;
}
function checkLogin(aData,aHttp){
  switch(this.stage){
  case ST_CHECK:
    this.getHtml(this.viewURL);
    return false;
  case ST_CHECK+1:
    var fnd=aData.match(/<input.+?name=["']passwd["']/);
    if(!fnd&&aData.match(/logout=1/)){//logged in already
      this.stage=ST_LOGIN_RES+3;
      var fnd2=aData.match(/location.href\s*=\s*['"](\S+?refresh_cookie\S+?)['"]/);
      if(fnd2){
        this.getHtml(fnd2[1]);
        return true;
      }else return this.process(aData,aHttp);
    }
    this.cookieManager.clear();//clear cookies because 'F' is saved
    this.stage=this.initStage;
    return this.process("");
  }
  this.onError();
  return true;
}
function process(aData,aHttp){
if(this.debug)dlog(this.id+"\t"+this.user+"\t"+this.stage,aData);
//dout(this.user+" "+this.stage);
  switch(this.stage){
  case ST_PRE:
    if(this.domain=="yahoo.com"){
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
    }
    this.stage=this.domain=="yahoo.co.jp"?ST_PRE+1:ST_LOGIN;
    this.getHtml(this.viewURL);//set cookie for login
    return true;
  case ST_PRE+1://yahoo.co.jp
    var fnd=aData.match(/\(".albatross"\)\[0\].value\s*=\s*"(\S+?)"/);
    if(fnd)this.albatross="&.albatross="+encodeURIComponent(fnd[1]);
    this.stage=ST_LOGIN;
    this.delay(4000);
    return true;
  case ST_LOGIN:
    if(this.albatross){
      this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]+this.albatross);
      delete this.albatross;
      return false;
    }
    var post=this.getForm(aData,"mbr-login-form");
    if(post){
      this.post=post;
      this.stage=ST_LOGIN_RES+10;
      this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]+"&"+post);
      return true;
    }else{
      var fnd=aData.match(/"sessionId"\s+value="(\S+?)"/);
      if(fnd)this.sessionId=fnd[1];
      var post=this.getForm(aData,"login_form",false,"</fieldset>");
      post=post.replace(/\.ws=0/,".ws=1");
      this.post=post;
      this.getHtml("https://login.yahoo.com/config/login",this.loginData[LOGIN_POST]+"&"+post);
      return false;
    }
  case ST_LOGIN_RES:
    var fnd=aData.match(/"code"\s*:\s*"1213"/);
    if(fnd&&this.post){
      if(this.main.prefBranch.getBoolPref("yahoo.showCaptcha")){
        this.stage=ST_LOGIN_RES+5;
        this.getHtml("https://login.yahoo.com/captcha/CaptchaWSProxyService.php?action=createlazy&initial_view=&.intl=us&.lang=en-US&sessionId="+this.sessionId+"&login="+this.user+"&rnd="+new Date().getTime());
        delete this.sessionId;
        return true;
      }
      this.onError();
      return true;
    }
    fnd=aData.match(/"code"\s*:\s*"9999"/);
    if(fnd&&this.post){//Second sign-in verification
      var d=JSON.parse(aData);
      d=JSON.parse(d.challenge_data);
      this.stage=ST_LOGIN_RES+7;
      var email;
      for(var i=0;i<d.challenges.length;i++){
        if(d.challenges[i].type==4){
          email=d.challenges[i].data[0][0];
          break;
        }
      }
      this.post+="&.z="+encodeURIComponent(d.z);
      this.secondEmail=email;
      this.getHtml("https://login.yahoo.com/config/login_unlock?z="+encodeURIComponent(d.z)+"&c_type=4&c_idx=0&c_stype=EMAIL&login="+this.user+"&_lang=en-US&_intl=us");
      return true;
    }
    delete this.post;
    fnd=aData.match(/"status"\s*:\s*"redirect",\s*"url"\s*:\s*"(\S+?)"/);//bt.com
    if(fnd){
      this.getHtml(fnd[1]);
      return false;
    }
    this.stage=ST_LOGIN_RES+1;
  case (ST_LOGIN_RES+1):
    if(this.domain=="yahoo.com"){
      var s=this.cookieManager.findCookieString(this.domain,"F");
      if(s){
        this.main.prefBranch.setCharPref("accounts.["+this.id+"#"+this.user+"].cookie",aHttp.URI.spec+"\t"+s);
      }
      s=this.cookieManager.findCookieString("login."+this.domain,"FS");
      if(s){
        this.main.prefBranch.setCharPref("accounts.["+this.id+"#"+this.user+"].cookie2",aHttp.URI.spec+"\t"+s);
      }
    }
    this.stage=ST_LOGIN_RES+2;
  case (ST_LOGIN_RES+2):
    this.getHtml(this.dataURL);
    return false;
  case (ST_LOGIN_RES+3):
    var fnd=aData.match(/location.replace\("(\S+?launch\?\S+?)"/);
    if(fnd){//https everywhere
      this.dataURL=fnd[1];
      this.getHtml(this.dataURL);
      return false;
    }
  case (ST_LOGIN_RES+4):
    var fnd=aData.match(/href="(https?:\/\/\S+?\/neo\/launch\?reason=ignore&rs=1)/);
    if(fnd){//not supported os or browser
      this.dataURL=fnd[1];
      this.viewURL=fnd[1];
      this.stage=ST_DATA;
      break;
    }
    this.stage=ST_DATA_RES;
    break;
  case (ST_LOGIN_RES+5)://captcha
    aData=aData.replace(/&amp;/g,"&").replace(/&quot;/g,"\"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&apos;/g,"'");
    this.post2=this.getForm(aData);
    var fnd=aData.match(/id="captchaV5ClassicCaptchaImg".+?src="(\S+?)"/);
    if(this.post2&&fnd){
      this.openAuthDialog(this.id,this.user,fnd[1]);
      return false;
    }
    break;
  case (ST_LOGIN_RES+6):
    if(aData){
      this.post2=this.post2+"&captchaAnswer="+encodeURIComponent(aData);
      this.post=this.post.replace(/\.cp=0/,".cp=1");
      this.stage=ST_LOGIN;
      this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]+"&"+this.post+"&"+this.post2);
      delete this.post2;
      delete this.post;
      return false;
    }
    break;
  case (ST_LOGIN_RES+7)://Second sign-in verification
    this.stage=ST_LOGIN_RES+8;
    this.openAuthDialog(this.id,this.user+"("+this.secondEmail+")",null);
    delete this.secondEmail;
    return true;
  case (ST_LOGIN_RES+8):
    if(aData){
      this.stage=ST_LOGIN;
      this.post=this.post.replace(/\.cp=0/,".cp=1");
      this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]+"&"+this.post+"&.2ndChallenge_email_code="+aData+"&.2ndChallenge_type_in=4");
      delete this.post;
      return false;
    }
    break;
  case ST_LOGIN_RES+10:
    var f=this.getForm(aData,"f",true);
    if(f){
      this.getHtml(f[0],f[1]);
      return false;
    }else{
      this.stage=ST_LOGIN_RES+1;
      return this.process(aData,aHttp);
    }
    break;
  case ST_LOGIN_RES+11:
    var post=this.getForm(aData,"frmConfirmId");
    if(post){
      var fnd=aData.match(/tag="email"[\S\s]+?value="(\S+?)"[\S\s]+?<\/span>(\S+?)<\/label>/);
      if(fnd){
        this.post="opt="+fnd[1]+"&"+post;
        this.secondEmail=fnd[2].replace(/&#(\d+);/g, function(m0,m1){return String.fromCharCode(m1);});
        this.getHtml("https://login.yahoo.com/ylc",this.post);
        return false;
      }
    }else{
      this.stage=ST_LOGIN_RES+1;
      return this.process(aData,aHttp);
    }
    break;
  case ST_LOGIN_RES+12:
    this.stage=ST_LOGIN_RES+13;
    this.openAuthDialog(this.id,this.user+"("+this.secondEmail+")",null);
    delete this.secondEmail;
    return true;
  case ST_LOGIN_RES+13:
    if(aData){
      this.getHtml("https://login.yahoo.com/ylc",this.post+"&mC="+aData);
      return false;
    }
    break;
  case ST_LOGIN_RES+14:
    var fnd=aData.match(/<form.+?name="auto-submit"/);
    if(fnd){
      var f=this.getForm(aData,null,true);
      if(f){
        this.stage=ST_LOGIN_RES+1;
        this.getHtml(f[0],f[1]);
        return true;
      }
    }
    break;
  }
  return this.baseProcess(aData,aHttp);
}

function getData(aData){
  var obj={};
  var ar=[];

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
  this.count=-1;
  return obj;
}
function getViewURL(aFolder){
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
