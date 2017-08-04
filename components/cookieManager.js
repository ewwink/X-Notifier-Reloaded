function CookieManager(){
  this.cookies=[];
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
          var t=ar[i].replace( /^\s+/g,"");
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
  isExpired: function(exp){
    if(exp){
      exp=exp.replace(/-(.+?)-(\d{2}) /," $1 20$2 ").replace(/-/g," ");
      if(Date.parse(exp)<new Date())return true;
    }
    return false;
  },
  _insert: function(val){
    var expired=this.isExpired(val.expires);
    for(var i in this.cookies){
      var o=this.cookies[i];
      if(o.name==val.name&&o.getDomain()==val.getDomain()&&o.getPath()==val.getPath()){
        if(expired)this.cookies.splice(i,1);
        else this.cookies[i]=val;
        return;
      }
    }
    if(!expired)this.cookies.push(val);
  },
  findCookie:function(domain,name){
    for(var o of this.cookies){
      if(endsWith(o.getDomain(),domain)&&o.name==name){
        return o.value;
      }
    }
    return null;
  },
  findCookieString:function(domain,name){
    for(var o of this.cookies){
      if(endsWith(o.getDomain(),domain)&&o.name==name){
        return o.toString();
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
    var str="";
    for(var o of this.cookies){
      var domain=o.getDomain();
      if(domain.charAt(0)==".")domain=domain.substring(1);
      if(aURI.host.lastIndexOf(domain)==-1)continue;
      if(aURI.path.indexOf(o.getPath())!=0)continue;
      if(o.secure&&aURI.scheme!="https")continue;
      if(this.isExpired(o.expires))continue;
      var s=o.name+"="+o.value;
      if(str)str+="; "+s;
      else str=s;
    }
    return str;
  },
  setCookieToBrowser: function(){
    var cm = Components.classes["@mozilla.org/cookiemanager;1"]
              .getService(Ci.nsICookieManager2);
    for(var o of this.cookies){
//if(!o.expires)dout(o.name+" "+o.getExpiry());
      try{
        if (cm.cookieExists){
          cm.add(o.getDomain(),o.getPath(),o.name,o.value,o.secure,o.httponly,!o.expires,o.getExpiry());
        }else{//ff2
          cm.add(o.getDomain(),o.getPath(),o.name,o.value,o.secure,!o.expires,o.getExpiry());
        }
      }catch(e){}
    }
  },
  copyTo:function(dst){
    var ar=[];
    for(var a of this.cookies)ar.push(a);
    dst.cookies=ar;
  },
  clear: function(){
    this.cookies=[];
  }
}
