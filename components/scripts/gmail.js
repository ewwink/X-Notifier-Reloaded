/***********************************************************
Gmail
***********************************************************/
var supportInboxOnly=true;
var supportShowFolders=true;
var supportIncludeSpam=true;

function init(){
  this.initStage=ST_PRE;
  this.loginData=["https://accounts.google.com/ServiceLoginAuth?service=mail",
                    "Email","Passwd","PersistentCookie=yes"];
  this.baseURL="https://mail.google.com/mail/";
  this.viewDomain="(mail|accounts).google.com";
  this.dataURL=this.baseURL;
  this.viewURL=this.baseURL;
}
function getIconURL(){
  return "https://ssl.gstatic.com/ui/v1/icons/mail/images/favicon2.ico";
}
function checkLogin(aData){
  switch(this.stage){
  case ST_CHECK:
    this.getHtml(this.baseURL);
    return false;
  case ST_CHECK+1:
    var fnd=aData.match(/\"https:\/\/accounts.google.com\/Logout/);
    if(fnd){//logged in
      this.stage=ST_LOGIN_RES+1;
      return this.process(aData);
    }else{
      this.cookieManager.clear();
      this.stage=this.initStage;
      return this.process("");
    }
  }
  this.onError();
  return true;
}
function isLoggedIn(aData){
  var reg=new RegExp("\"\\/mail(?:\\/u\\/(\\d+))?\",\\S+?,\"(\\S+?)\"");
  var fnd=aData.match(reg);
  var fnd2=aData.match(/GM_ACTION_TOKEN="(\S+?)"/);
  if(fnd&&fnd2){
    this.viewURL=this.baseURL+(fnd[1]?"u/"+fnd[1]:"");
    this.dataURL=this.viewURL+"?ui=2&ik="+fnd[2]+"&at="+fnd2[1]+"&view=tl&start=0&num=25&rt=c&as_has=is%3Aunread&as_subset="+(this.inboxOnly?"inbox":"all")+"&search=adv";
    var fnd3=aData.match(/"sx_iosc"\s*,\s*"(\S+?)"/);
    if(fnd3){
      if((fnd3[1]=="^u|"||fnd3[1]=="^t|"))this.useInboxCount=true;
      if(fnd3[1].match(/\^smartlabel_personal\|\S+/))this.smList=fnd3[1].split("|");
    }
    var fnd4=aData.match(/"ix_ioiut"\s*,\s*"(\S+?)"/);
    if(fnd4&&fnd4[1]=="1")this.useInboxCount=true;
    this.UI=2;
    return 1;
  }
  //basic HTML
  /*fnd=aData.match(/<base href="(\S+?)">/);
  if(fnd){
    this.viewURL=fnd[1];
    this.dataURL=fnd[1]+"?s=q&q=is%3Aunread"+(this.inboxOnly?"+in%3Ainbox":"");
    this.UI=0;
    return 1;
  }*/
  return -1;
}
function process(aData,aHttp) {
//dout(this.user+" "+this.stage);
if(this.debug)dlog(this.id+"\t"+this.user+"\t"+this.stage,aData);
  switch(this.stage){
  case ST_PRE:
    try{
      var s=this.main.prefBranch.getCharPref("accounts.["+this.id+"#"+this.user+"].cookie");
      s=s.split("\t");
      this.cookieManager.addCookies(s[0],s[1]);
    }catch(e){}
    this.getHtml("https://accounts.google.com/ServiceLogin?service=mail&continue=https%3A%2F%2Fmail.google.com%2Fmail%2F&rip=1&nojavascript=1");
    return false;
  case ST_PRE_RES:
    var form=this.getForm(aData,"gaia_loginform",true);
    if(form){
      this.stage=ST_LOGIN;
      this.getHtml("https://accounts.google.com/signin/challenge/sl/password",this.loginData[LOGIN_POST]+"&"+form[1]);
      return false;
    }
    break;
  case ST_LOGIN_RES:
    var form=this.getForm(aData,"challenge",true);
    if(form){//2-step verification
      this.form=form;
      this.stage=ST_LOGIN_RES+2;
      this.openAuthDialog(this.id,this.user,null);
      return true;
    }
    ++this.stage;
  case ST_LOGIN_RES+1:
    if(this.isLoggedIn(aData)==1){
      if(this.enableCategory||this.smList){
        var fnd=aData.match(/\["sld",\[(\[[\s\S]+?\])\]/);
        if(fnd){
          var re=/\["(.+?)"\s*,\s*"(.+?)"/g;
          var o;
          this.smartlabel={};
          while ((o = re.exec(fnd[1])) != null){
            var fn=unescape(o[2].replace(/\\u/g,"%u"))
            this.smartlabel[o[1]]=fn;
          }
        }
      }
      this.stage=ST_DATA;
    }
    break;
  case (ST_LOGIN_RES+2)://2-step verification
    if(aData){
      this.getHtml("https://accounts.google.com/"+this.form[0],this.form[1]+"&Pin="+encodeURIComponent(aData)+"&TrustDevice=on");
      delete this.form;
      return false;
    }
    break;
  case (ST_LOGIN_RES+3)://2-step verification
    var ck=this.cookieManager.findCookieString("accounts.google.com","SMSV");
    if(ck){
      this.main.prefBranch.setCharPref("accounts.["+this.id+"#"+this.user+"].cookie",aHttp.URI.spec+"\t"+ck);
    }
    this.stage=ST_LOGIN_RES;
    return this.process(aData,aHttp);
  }
  return this.baseProcess(aData,aHttp);
}
function getCount(aData){
  var fnd;
  if(this.UI==2){
    if(this.inboxOnly)fnd=aData.match(this.useInboxCount||this.enableCategory==2?/"ld",\[[\S\s]*?\["\^i",(\d+)/:/"ld",\[\["\^ig?",(\d+)/);
    else fnd=aData.match(/\["ti",.+?,(\d+)/);
    if(fnd){
      if(this.includeSpam){
        var fnd2=aData.match(/"ld",\[\[[\S\s]+?"\^s",(\d+)/);
        if(fnd2){
          var spam=parseInt(fnd2[1]);
          if(spam>0){
            this.spam=spam;
            return parseInt(fnd[1])+(this.includeSpam==2?this.spam:0);
          }
        }
      }
      return fnd[1];
    }else return -1;
  }else{
    var spam=0;
    if(this.includeSpam){
      fnd=aData.match(/<a href="\?s=m"\s*\S+?\((\d+)\)/);
      if(fnd){
        spam=parseInt(fnd[1]);
        if(spam>0){
          this.spam=spam;
          if(this.includeSpam!=2)spam=0;
        }
      }
    }
    if(this.inboxOnly){
      fnd=aData.match(/<\/h2>\s*<tr>\s*<td[\s\S]+?<a[\s\S]+?>.+?(?:&nbsp;\s*\(\s*(\d+)\s*\))?\s*</);
      return fnd?((fnd[1]?parseInt(fnd[1]):0)+spam):-1;
    }else{
      fnd=aData.match(/nvp_bbu_go[\s\S]+?<\/td>([\s\S]+?)<\/table>/);
      if(fnd){
        var n=0;
        var fnd2=fnd[1].match(/<b>(\S+)<\/b>(.+?)<b>(\d+)<\/b>(.+?)<b>(\S+)<\/b>/);
        if(fnd2){
          if(fnd2[2].indexOf("-")!=-1)n=isNaN(parseInt(fnd2[5]))?200:fnd2[5];
          else if(fnd2[4].indexOf("-")!=-1)n=isNaN(parseInt(fnd2[1]))?200:fnd2[1];
        }
        return parseInt(n)+spam;
      }else return -1;
    }
  }
}
function getData(aData){
  var obj={};
  if(!this.showFolders)return obj;
  var ar=[];
  var fnd;
  if(this.UI==2){
    var d=aData;
    fnd=null;
    var list=[];
    while(fnd=d.match(/\n(\d+?)(\n([\S\s]+))/)){
      d=fnd[2].substring(0,fnd[1]);
      d=d.replace(/\[\s*,/g,"[null,").replace(/,\s*(?=,)/g,",null").replace(/,\s*\]/g,",null]");
      var o=JSON.parse(d);
      list=list.concat(o);
      d=fnd[3];
    }
   
    fnd=null;
    for(var i=0;i<list.length;i++){
      if(list[i][0]=="ld"){
        fnd=list[i];
        break;
      }
    }
    if(fnd){
      if(fnd[2]){
        var t=fnd[2];
        for(var i=0;i<t.length;i++){
          var o=t[i];
          if(o[1]>0){
            ar.push({id:o[0],count:o[1]});
          }
        }
      }

      if(this.enableCategory||this.smList){
        if(fnd[4]){
          var t=fnd[4];
          var slb={"social":"social","promo":"promotions","notification":"updates","group":"forums"};
          for(var i=0;i<t.length;i++){
            var o=t[i];
            if(this.enableCategory||this.smList.indexOf(o[0])!=-1){
              if(o[1]>0){
                ar.push({id:"#category/"+slb[o[0].substring(12)],title:this.smartlabel?this.smartlabel[o[0]]:o[0],count:o[1]});
              }
            }
          }
        }
      }
    }
  }else{
    fnd=aData.match(/<td class="?lb"?>([\s\S]+?)<a class="ml"/);
    if(fnd){
      var re=/<a href="(\S+?)">\s*<font[\s\S]+?>(.+?)(?:&nbsp;\s*\(\s*(\d+)\s*\))?\s*</g;
      var o;
      while ((o = re.exec(fnd[1])) != null){
        if(parseInt(o[3])>0){
          ar.push({id:o[2],count:o[3]});
        }
      }
    }
  }
  if(this.spam!=null){
    ar.push({id:"Spam",count:this.spam});
    delete this.spam;
  }
  if(ar)obj.folders=ar;
  return obj;
}
function getViewURL(aFolder){
  if(aFolder){
    if(aFolder=="Spam"){
      if(this.UI==2)return this.viewURL+"#spam";
      else return this.viewURL+"?s=m";
    }
    if(this.UI==2){
      if(aFolder.indexOf("#category/")==0)return this.viewURL+aFolder;
      else return this.viewURL+"#label/"+encodeURIComponent(aFolder);
    }else return this.viewURL+"?s=l&l="+encodeURIComponent(aFolder);
  }
  return this.viewURL;
}