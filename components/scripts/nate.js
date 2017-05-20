/***********************************************************
nate
***********************************************************/
var hostString="nate.com";
var supportInboxOnly=true;
var supportShowFolders=true;

function init(){
  this.initStage=ST_PRE;
  this.dataURL="http://mail3.nate.com/app/newmail/main/boxinfo/";
  this.viewURL="http://mail3.nate.com/";
  this.viewDomain="mail.+?.nate.com";
  var ar=this.user.split("@");
  this.loginData=["https://xo.nate.com/LoginAuth.sk",
                      "","PASSWD",
                      "ID="+encodeURIComponent(ar[1]=="nate.com"?ar[0]:this.user)+"&domain="+encodeURIComponent(ar[1])];

  this.cookieDomain="nate.com";

  this.logoutURL="http://xo.nate.com/commonLogout.jsp";
}
function getIconURL(){
  return "http://www.nate.com/favicon.ico";
}
function process(aData,aHttp) {
  switch(this.stage){
  case ST_PRE:
    this.getHtml("http://home.mail.nate.com/login/secure/nate/js/xecure_nate.js?v=20130123120000");
    return false;
  case ST_PRE_RES:
    var fnd=aData.match(/nvalue\s*:\s*'(\S+?)'[\s\S]+?'NATE'\s*?\)\s*?{\s*?this\.evalue\s*=\s*'(\S+?)'/);
    if(fnd){
      var rsa = new RSAKey();
	    rsa.setPublic(fnd[2],fnd[1]);
      var ar=this.user.split("@");
	    var fullData = this.getFullToday()+'|^|'+ar[0]+'|^|'+this.password;
	    var res = rsa.encrypt(fullData);
      res=hex2b64(res);
      this.stage=ST_LOGIN_RES;
      this.getHtml(this.loginData[LOGIN_URL],this.loginData[LOGIN_POST]+"&PASSWD_RSA="+encodeURIComponent(res));
      return true;
    }
    break;
  case ST_LOGIN_RES:
    var fnd=aData.match(/replace\("(\S+?)"/);
    if(fnd){
      this.stage=ST_DATA
    }else break;
  case ST_DATA:
    this.getHtml(this.dataURL,"d=%7B%22cmd%22%3A%22mailbox%22%7D");
    return false;
  }
  return this.baseProcess(aData,aHttp);
}
function getData(aData){
  var obj={}
  this.folders={};
  var num=0;
  var fnd=aData.match(/"mboxes"/);
  if(fnd){
    var ar=[];
    var re=/"mboxid":"(\S+?)","mboxType":"(\S+?)","mboxName":"(\S+?)".+?"unseen":"(\d+)"/g;
    var o;
    while ((o = re.exec(aData)) != null){
      if(o[2]!="1"&&o[2]!="10")continue;
      var n=parseInt(o[4]);
      if(o[2]=="1"||!this.inboxOnly)num+=n;
      if(n>0&&o[2]!="1"){
        var nm=unescape(o[3].replace(/\\u/g,"%u"))
        ar.push(nm);
        ar.push(n);
        this.folders[nm]=o[1];
      }
    }
    this.count=num;
    if(this.showFolders){
      if(ar)obj.folders=ar;
    }
    return obj;
  }
  this.count=-1;
  return obj;
}
function getViewURL(aFolder){
  if(aFolder){
    return "http://mail3.nate.com/#list/?mboxid="+this.folders[aFolder];
  }
  return this.viewURL;
}

function getFullToday(){
  var today = new Date();
  var buf = "";
  buf += today.getYear() + "y";
  buf += (today.getMonth() + 1) + "m";
  buf += today.getDate() + "d ";
  buf += today.getHours() + "h";
  buf += today.getMinutes() + "m";
  buf += today.getSeconds() + "s";
  return buf;
}