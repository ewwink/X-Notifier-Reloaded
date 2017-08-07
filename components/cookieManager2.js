function CookieManager(){
}
CookieManager.prototype={
  addCookies: function(aURI,aCookie){
    if(!aCookie)return;
    if(typeof(aURI)=="string"){
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Ci.nsIIOService);
      aURI=ioService.newURI(aURI,null,null);
    }
    aCookie=aCookie.split("\n");
    for(var o of aCookie){
      var val=new CookieInfo();
      var ar=o.split(";");
      var t=ar[0].match(/(\S+?)=(.*)/);
      val["name"]=t[1];
      val["value"]=t[2];

      for(var i=1;i<ar.length;i++){
        if(ar[i]){
          var t=ar[i].replace(/^\s+/g,"");
          var f=t.match(/(\S+?)=(.*)/);
          if(f){
            var pn=f[1].toLowerCase();
            val[pn]=f[2].replace(/\s+$/,"");
            if(pn=="domain"&&val[pn].charAt(0)!=".")val[pn]="."+val[pn];
          }else{
            t=t.toLowerCase();
            if(t=="httponly"||t=="secure")val[t]=true;
            else val[t]="";
          }
        }
      }
      val.uri=aURI;
      this._insert(val);
//if(val.getPath()!=val.path)dout(val.getDomain()+" "+val.getPath()+" "+val.domain+" "+val.path);
    }
  },
/*  isExpired: function(exp){
    if(exp){
      exp=exp.replace(/-(.+?)-(\d{2}) /," $1 20$2 ").replace(/-/g," ");
      if(Date.parse(exp)<new Date())return true;
    }
    return false;
  },*/
  _insert: function(val){
    var cm = Components.classes["@mozilla.org/cookiemanager;1"]
              .getService(Ci.nsICookieManager2);
    try{
      if (cm.cookieExists){
//dout(val);
//dout(val.getDomain()+this.ext+","+val.getPath()+","+val.name+" "+val.value+","+val.secure+","+val.httponly+","+!val.expires+","+val.getExpiry());
        cm.add(val.getDomain()+this.ext,val.getPath(),val.name,val.value,val.secure,val.httponly,!val.expires,val.getExpiry());
      }else{//ff2
        cm.add(val.getDomain()+this.ext,val.getPath(),val.name,val.value,val.secure,!val.expires,val.getExpiry());
      }
    }catch(e){}
  },
  findCookie:function(domain,name){
    var cm = Components.classes["@mozilla.org/cookiemanager;1"].
                getService(Components.interfaces.nsICookieManager2);
    var enm = cm.enumerator;
    while(enm.hasMoreElements()){
      var ck = enm.getNext();
      if (ck && ck instanceof Components.interfaces.nsICookie2){
        if(endsWith(ck.host,domain+this.ext)&&ck.name==name){
          return ck.value;
        }
      }
    }
    return null;
  },
  _cookieToString:function(ck){
    var s=ck.name+"="+ck.value;
    if(ck.expires!=0)s+="; expires="+new Date(ck.expires*1000).toUTCString();
    if(ck.path)s+="; path="+ck.path;
    if(ck.host)s+="; domain="+ck.host.substring(0,ck.host.length-this.ext.length);
    if(ck.secure)s+="; secure";
    if(ck.httponly)s+="; httponly";
    return s;
  },
  findCookieString:function(domain,name){
    var cm = Components.classes["@mozilla.org/cookiemanager;1"].
                getService(Components.interfaces.nsICookieManager2);
    var enm = cm.enumerator;
    while(enm.hasMoreElements()){
      var ck = enm.getNext();
      if (ck && ck instanceof Components.interfaces.nsICookie2){
        if(endsWith(ck.host,domain+this.ext)&&ck.name==name){
          return this._cookieToString(ck);
        }
      }
    }
    return null;
  },
  getCookie: function(aURI){
    if(typeof(aURI)=="string"){
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Ci.nsIIOService);
      aURI=ioService.newURI(aURI,null,null);
    }
    var host=aURI.host+this.ext;
    /*var cs = Components.classes["@mozilla.org/cookieService;1"]
                  .getService(Components.interfaces.nsICookieService);
    return cs.getCookieStringFromHttp(aURI,null,null);*/
    var cm = Components.classes["@mozilla.org/cookiemanager;1"].
                getService(Components.interfaces.nsICookieManager2);
    var enm = cm.enumerator;
    var str="";
    while(enm.hasMoreElements()){
      var ck = enm.getNext();
      if (ck && ck instanceof Components.interfaces.nsICookie){
        if(endsWith(ck.host,this.ext)){
          var domain=ck.host;
          if(domain.charAt(0)==".")domain=domain.substring(1);
          if(!endsWith(host,domain))continue;
          // nsIURI.path was renamed to nsIURI.pathQueryRef in bug 1326520
          var path = 'pathQueryRef' in aURI ? aURI.pathQueryRef : aURI.path;
          if(path.indexOf(ck.path)!=0)continue;
          if(ck.isSecure&&aURI.scheme!="https")continue;
          if(ck.expires!=0&&ck.expires*1000<new Date())continue;
          var s=ck.name+"="+ck.value;
          if(str)str+="; "+s;
          else str=s;
        }
      }
    }
    return str;
  },
  setCookieToBrowser: function(){
    this.copyTo();
  },
  copyTo:function(dst){
    var cm = Components.classes["@mozilla.org/cookiemanager;1"].
                getService(Components.interfaces.nsICookieManager2);
    var enm = cm.enumerator;
    if(dst)dst.clear();
    while(enm.hasMoreElements()){
      var ck = enm.getNext();
      if (ck && ck instanceof Components.interfaces.nsICookie2){
        if(endsWith(ck.host,this.ext)){
          try{
            var host=ck.host.substring(0,ck.host.length-this.ext.length);
            if(dst)host+=dst.ext;
            if (cm.cookieExists){
              cm.add(host,ck.path,ck.name,ck.value,ck.isSecure,ck.isHttpOnly,ck.isSession,ck.expiry);
            }else{//ff2
              cm.add(host,ck.path,ck.name,ck.value,ck.isSecure,ck.isSession,ck.expiry);
            }
          }catch(e){}
        }
      }
    }
  },
  clear: function(){
    var obj = Components.classes["@mozilla.org/cookiemanager;1"].
                getService(Components.interfaces.nsICookieManager2);
    var enm = obj.enumerator;
    while(enm.hasMoreElements()){
      var ck = enm.getNext();
      if (ck && ck instanceof Components.interfaces.nsICookie2){
        if(endsWith(ck.host,this.ext)){
          try{
            obj.remove(ck.host,ck.name,ck.path,false,{});
          }catch(e){
            obj.remove(ck.host,ck.name,ck.path,false);
          }
        }
      }
    }
  }
}
