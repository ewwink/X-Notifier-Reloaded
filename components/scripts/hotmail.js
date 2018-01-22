/***********************************************************
Live(Hotmail)
***********************************************************/
var hostString="hotmail.com";
var supportInboxOnly=true;
var supportShowFolders=true;
var supportIncludeSpam=true;

function init(){
  this.initStage=ST_PRE;
  this.loginData=["","login","passwd","KMSI=1&LoginOptions=1"];
  this.dataURL="https://outlook.live.com/owa/?nlp=1";
  this.viewURL="https://outlook.live.com/owa/?nlp=1";
  this.viewDomain="outlook.live.com";
  if(this.password.length>16)this.password=this.password.substring(0,16);

  this.cookieDomain="live.com";

  this.logoutURL="https://outlook.live.com/owa/logoff.owa";
}
function getIconURL(){
  return "https://outlook.live.com/mail/favicon.ico";
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
    var fnd=aData.match(/urlPost:/);
    if(!fnd){
      var reg=new RegExp("\"Address\":\""+this.user.replace(/@/,"\\\\u0040")+"\"","i");
      var fnd2=aData.match(reg);
      if(fnd2){//logged in already
        this.stage=ST_LOGIN_RES;
        return this.process(aData);
      }else{
        var fnd3=aData.match(/clientId:\s*?'(\S+?)'/);
        var fnd4=aData.match(/window\.clientId/);
        if(!fnd3&&!fnd4){
          this.cookieManager.clear();
          this.stage=(ST_LOGIN_RES+9);
          this.getHtml(this.logoutURL);
          return true;
        }else{
          if(fnd3)this.viewURL="https://outlook.live.com/mail/";
          else this.viewURL="https://outlook.live.com/owa/#path=/mail";
          this.dataURL=["https://outlook.live.com/owa/sessiondata.ashx?appcacheclient=0","appcacheclient=0"];
          this.getHtml(this.dataURL);
          return false;
        }
      }
    }else{
      var fnd=aData.match(/sFT:'(\S+?)'/);
      if(fnd)this.stage=ST_LOGIN_RES;
      else this.stage=ST_PRE_RES;
      return this.process(aData);
    }
  case ST_CHECK+2:
    var f=aData.match(new RegExp('"LogonEmailAddress":"'+this.user+'"',"i"));
    if(f){
      this.isNew=2;
      this.stage=ST_DATA_RES;
      return this.process(aData);      
    }else{
      this.viewURL="https://outlook.live.com/owa/?nlp=1";
      this.cookieManager.clear();
      this.stage=(ST_LOGIN_RES+9);
      this.getHtml(this.logoutURL);
      return true;      
    }
  }
  this.onError();
  return true;
}
function process(aData,aHttp) {  
if(this.debug)dlog(this.id+"\t"+this.user+"\t"+this.stage,aData);
  switch(this.stage){
  case ST_PRE:
// vs 3 cookieManager code
    try{
      var s=this.main.prefBranch.getCharPref("accounts.["+this.id+"#"+this.user+"].cookie");
      s=s.split("\t");
      this.cookieManager.addCookies(s[0],s[1]);
    }catch(e){}
// END vs 3 cookieManager code
    this.getHtml("https://outlook.live.com/owa/?nlp=1");
    return false;
  case ST_PRE_RES:
    var fnd=aData.match(/urlPost:\'([\s\S]+?)\'/);
    if(fnd){
      this.loginData[LOGIN_URL]=fnd[1];
      fnd=aData.match(/PPFT[\s\S]+?value=\"(\S+?)\"/);
      if(fnd){
        this.stage=ST_LOGIN;
        this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]+"&PPFT="+encodeURIComponent(fnd[1]));
        return false;
      }
    }
    this.onError();
    return true;
  case ST_LOGIN_RES:
    var fnd=aData.match(/sFT:'(\S+?)'/);
    if(fnd){//2-step verification
      var fnd2=aData.match(/urlPost:'(\S+?)'/);
      var fnd3=aData.match(/data:'([^}]+?)',type:([^}]+?),[^}]*?display:'([^}]+?)',[^}]*?otcSent:([^,]+?),[^}]*?isSADef:true,isVoiceDef:(\S+?)[,}]/);
      var fnd5=aData.match(/,g:'(\S+?)'/);
      if(fnd2&&fnd3&&fnd5){
        this.form=[fnd2[1],
                  "login="+encodeURIComponent(fnd5[1])+"&type="+(fnd3[2]=="10"?19:18)
                  +"&PPFT="+encodeURIComponent(fnd[1])
                  +"&SentProofID="+encodeURIComponent(fnd3[1])];
        if(fnd3[2]=="10"||fnd3[4]=="true"){//OTP App or Sent
          this.stage=(ST_LOGIN_RES+6);
          this.openAuthDialog(this.id,this.user,null);
          return true;
        }else{
          var fnd4=aData.match(/<base href="(\S+?)"/);
          if(fnd4){
            var type={SQSA: 6, CSS: 5, DeviceId: 4, Email: 1, AltEmail: 2, SMS: 3, HIP: 8, Birthday: 9, TOTPAuthenticator: 10, Voice: -3};
            var t=parseInt(fnd3[2]);
            if(fnd3[5]=="true")t=-t;
            var chn;
            for(var i in type){
              if(type[i]==t){
                chn=i;
                break;
              }
            }
            if(!chn)break;
            var dtype=null;
            switch(t){
            case type.Voice:
            case type.SMS:
              dtype="MobileNumE";
              break;
            case type.Email:
            case type.AltEmail:
              dtype="AltEmail";
              break;
            }
            this.authURL=[fnd4[1]+"GetOneTimeCode.srf",
                        "login="+encodeURIComponent(fnd5[1])+"&flowtoken="+encodeURIComponent(fnd[1])+"&purpose=eOTT_OneTimePassword&channel="+chn
                        +(dtype?"&"+dtype+"="+encodeURIComponent(fnd3[1]):"")+"&UIMode=11"];            
            if(dtype=="MobileNumE"){
              this.stage=(ST_LOGIN_RES+8);
              this.openAuthDialog(this.id,this.user+"("+fnd3[3]+")",null);
            }else{
              this.stage=(ST_LOGIN_RES+5);
              this.getHtml(this.authURL);
              delete this.authURL;
            }
            return true;
          }
        }
      }
      this.onError();
      return true;
    }
    var f=this.getForm(aData,"fmHF",true);
    if(f){//@hotmail.com, @live.nl
      this.getHtml(f[0],f[1]);
      return false;
    }
    ++this.stage;
  case ST_LOGIN_RES+1:
    var fnd=aData.match(/window.location.replace\([\'\"](\S+?)[\'\"]/);      
    if(fnd){//login expired
      this.getHtml(fnd[1]);
      return false;
    }
    ++this.stage;
  case ST_LOGIN_RES+2:
    var f=this.getForm(aData,"fmHF",true);
    if(f){//new outlook UI
      this.getHtml(f);
      return false;
    }    
    ++this.stage;
  case ST_LOGIN_RES+3:
    var fnd=aData.match(/clientId:\s*?'(\S+?)'/);//new beta  
    if(fnd){
      this.isNew=2;
      this.dataURL=["https://outlook.live.com/owa/sessiondata.ashx?appcacheclient=0","appcacheclient=0"];
      this.viewURL="https://outlook.live.com/mail/";
      this.mailHost=this.viewURL;
      this.stage=ST_DATA;
      break;
    }    
    fnd=aData.match(/window\.clientId/);
    if(fnd){
      this.isNew=2;
      this.dataURL=["https://outlook.live.com/owa/sessiondata.ashx?appcacheclient=0","appcacheclient=0"];
      this.viewURL="https://outlook.live.com/owa/#path=/mail";
      this.mailHost=this.viewURL;
      this.stage=ST_DATA;
      break;
    }
    fnd=aData.match(/ol\.config/);
    if(fnd){
      fnd=aData.match(/<base\s+?href="(\S+?)"/);
      if(fnd){
        this.isNew=1;
        var url=fnd[1].match(/(((\S+):\/\/([^/]+))(\S*\/)?)([^/]*)/);
        if(url)url=url[2];
        else url=fnd[1];
        this.dataURL=url;
        this.mailHost=url;
        this.stage=ST_DATA_RES;
        break;
      }
    }
    fnd=aData.match(/"afu":"(\S+?InboxLight.aspx\S+?)"/);
    if(fnd){
      fnd=unescape(fnd[1].replace(/\\u/g,"%u"));
      this.dataURL=fnd;
      this.viewURL=fnd;
      var url=this.dataURL.match(/(((\S+):\/\/([^/]+))(\S*\/)?)([^/]*)/);
      if(url)this.mailHost=url[2];
      this.stage=ST_DATA_RES;
    }else{
      fnd=aData.match(/href="(\S+?InboxLight.aspx\S+?)">/);
      if(fnd){//Thunderbird(browser check)
        fnd=fnd[1].replace(/&#(\d+);/g,function(){return String.fromCharCode(RegExp.$1);});
        this.stage=ST_LOGIN_RES+4;
        this.getHtml(fnd);
        return true;
      }
      fnd=aData.match(/"hn":"(\S+?)"/);//Https check
      if(fnd){
        this.dataURL="https://"+fnd[1]+"/default.aspx?rru=inbox";
        this.mailHost="https://"+fnd[1];
        this.viewURL=this.dataURL;
        this.stage=ST_DATA;
      }
    }
    break;
  case ST_LOGIN_RES+4:
    var fnd=aData.match(/<base\s+href="(\S+?)"/);
    if(fnd){
      var url=fnd[1].match(/(((\S+):\/\/([^/]+))(\S*\/)?)([^/]*)/);
      if(url)this.mailHost=url[2];
    }
    this.stage=ST_DATA_RES;
    break;
  case (ST_LOGIN_RES+5)://2-step verification
    if(aData.match(/"State":201/)){
      this.stage=(ST_LOGIN_RES+6);
      this.openAuthDialog(this.id,this.user,null);
      return true;
    }
    break;
  case (ST_LOGIN_RES+6)://2-step verification
    if(aData){
      this.stage=ST_LOGIN_RES+10;// vs 3
      this.getHtml(this.form[0],"otc="+encodeURIComponent(aData)+"&AddTD=1&"+this.form[1]);
      delete this.form;
      return true;
    }
    break;
  case (ST_LOGIN_RES+8)://2-step verification for phone
    if(aData){
      this.stage=ST_LOGIN_RES+5;
      this.getHtml(this.authURL[0],this.authURL[1]+"&ProofConfirmation="+aData);
      delete this.authURL;
      return true;
    }
    break;
  case (ST_LOGIN_RES+9)://new beta is not logged out with getHtml(logoutURL);
    this.stage=this.initStage;
    this.getHtml("https://login.live.com/logout.srf");
    return true;

	// vs 3 cookieManager code
  case (ST_LOGIN_RES+10)://2-step verification
    this.stage=ST_LOGIN_RES;
    var ck=this.cookieManager.findCookieString("login.live.com","SDIDC");
    if(ck){
      this.main.prefBranch.setCharPref("accounts.["+this.id+"#"+this.user+"].cookie",aHttp.URI.spec+"\t"+ck);
    }
    return this.process(aData,aHttp);
// END vs 3 cookieManager code
  }
  return this.baseProcess(aData,aHttp);
}
function getData(aData){
  var obj={};
  var ar=[];
  this.count=-1;

  if(this.isNew==2){
    try{
      var o=JSON.parse(aData);

      var reg=new RegExp(this.user,"i");
      var fnd2=o.owaUserConfig.SessionSettings.LogonEmailAddress.match(reg);
      if(!fnd2)return obj;

      var l=o.findFolders.Body.ResponseMessages.Items[0].RootFolder.Folders;
      this.count=0;
      var folders={};      
      for(var i in l){
        var f=l[i];
        folders[f.FolderId.Id]=f.DisplayName;
        if(f.FolderClass!="IPF.Note")continue;
        var fid=f.DistinguishedFolderId?f.DistinguishedFolderId:f.FolderId.Id;
        if(fid=="sentitems"||fid=="drafts"||fid=="deleteditems"||fid=="outbox")continue;
        if(!this.includeSpam&&fid=="junkemail")continue;
        var n=f.UnreadCount;
        if(fid=="junkemail"){
          if(this.includeSpam==2)this.count+=n;
        }else if(this.inboxOnly){
          if(fid=="inbox")this.count+=n;
        }else this.count+=n;
        if(n>0&&fid!="inbox"){
          var fname;
          if(folders[f.ParentFolderId.Id])fname=folders[f.ParentFolderId.Id]+"/"+f.DisplayName;
          else fname=f.DisplayName;
          var t={id:fid,title:fname,count:n};
          ar.push(t);
        }
      }
      if(this.showFolders)obj.folders=ar;
    }catch(e){}
    return obj;
  }    

  var reg=new RegExp("\"Address\":\""+this.user.replace(/@/,"\\\\u0040")+"\"","i");
  var fnd2=aData.match(reg);
  if(!fnd2)return obj;

  if(this.isNew==1){
    var fnd=aData.match(/HM.ContainerPoolData\(.+?\{([\s\S]+?)\},\s*\[([\S\s]+?)\]/);
    if(fnd){
      var order=fnd[2].split(",");
      fnd=fnd[1];
      var re=/Folder\("(\S+?)","(\S+?)".+?"([^"]+?)",(\d+)\)\)/g;
      var o;
      this.count=0;
      while ((o = re.exec(fnd)) != null){
        if(o[1]=="fldrafts"||o[1]=="flsent"||o[1]=="fltrash")continue;
        if(!this.includeSpam&&(o[1]=="fljunk"||o[2]=="fljunk"))continue;
        var n=parseInt(o[4]);
        if(o[1]=="fljunk"||o[2]=="fljunk"){
          if(this.includeSpam==2)this.count+=n;
        }else if(this.inboxOnly){
          if(o[1]=="flinbox")this.count+=n;
        }else this.count+=n;
        if(n>0&&o[1]!="flinbox"){
          var name=o[3];
          name=unescape(name.replace(/\\u/g,"%u").replace(/\\x/g,"%"));
          var i=order.indexOf("\""+o[1]+"\"");
          var t={id:o[1],title:name,count:n};
          if(i>=0)ar[i]=t;
          else ar.push(t);
        }
      }
      if(this.showFolders){
        if(ar){
          for(var i=0;i<ar.length;i++){
            if(!ar[i])ar.splice(i--,1);
          }
          obj.folders=ar;
        }
      }
      return obj;
    }
  }

  var fnd=aData.match(/<ul.+?class="List FolderList.+?>([\s\S]+?)<\/ul>/g);
  if(fnd){
    fnd=fnd.toString();
    var re=/<li.+?\s+id="(.+?([^-]+?))"\s+nm="(.+?)"\s+count="(\d+)"/g;
    var o;
    this.count=0;
    while ((o = re.exec(fnd)) != null){
      if(o[2]=="000000000004"
        ||o[2]=="000000000003"||o[2]=="000000000002")continue;
      if(!this.includeSpam&&o[2]=="000000000005")continue;
      var n=parseInt(o[4]);
      if(o[2]=="000000000005"){
        if(this.includeSpam==2)this.count+=n;
      }else if(this.inboxOnly){
        if(o[2]=="000000000001")this.count+=n;
      }else this.count+=n;
      if(n>0&&o[2]!="000000000001"){
        var name=o[3];
        name=name.replace(/&#(\d+);/g,function(){return String.fromCharCode(RegExp.$1);});
        ar.push({id:o[1].replace(/-/g,""),title:name,count:n});
      }
    }
    if(this.showFolders){
      if(ar)obj.folders=ar;
    }
    return obj;
  }
  return obj;
}
function getViewURL(aFolder){
  if(aFolder&&this.mailHost){
    if(this.isNew==2)return this.mailHost+"/"+encodeURIComponent(aFolder);
    else if(this.isNew==1)return this.mailHost+"/?fid="+aFolder;
    var url=this.mailHost+"/mail/InboxLight.aspx?fid="+aFolder
              +"&n="+parseInt(Math.random()*1000000000);
    return url;
  }
  return this.viewURL;
}
