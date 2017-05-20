/***********************************************************
daum(hanmail)
***********************************************************/
var hostString="";
var supportInboxOnly=true;
var supportShowFolders=true;
var keepLogin=true;
function init(){
  this.initStage=ST_PRE;
  this.loginData=["https://logins.daum.net/accounts/login.do",
                      "id",null,"stln=on"];
  this.dataURL="http://mail.daum.net/hanmailex/Top.daum";
  this.viewURL="http://mail.daum.net/hanmailex/Top.daum";
  this.viewDomain="mail.*?.daum.net";

  this.cookieDomain="daum.net";

  this.logoutURL="https://logins.daum.net/accounts/logout.do";
}
function checkLogin(aData,aHttp){
  switch(this.stage){
  case ST_CHECK:
    this.getHtml(this.dataURL);
    return false;
  case ST_CHECK+1:
    var fnd=aData.match(/<div\s+id="daumLogin"/);
    if(!fnd){//logged in already
      this.stage=ST_DATA;
      return this.process(aData,aHttp);
    }else{
      this.cookieManager.clear();
      this.stage=this.initStage;
      return this.process("");
    }
  }
  this.onError();
  return true;
}
function process(aData,aHttp){
  switch(this.stage){
  case ST_PRE:
    this.getHtml("https://track.tiara.daum.net/queen/footsteps");
    return false;
  case ST_PRE_RES:
    this.stage=ST_LOGIN;
    this.getHtml(daumlogin.srp.init(this.user,this.password));
    return true;
  case ST_LOGIN:
    var result=JSON.parse(aData.replace(/var\s+result\s+=/,""));
    if(result.rescode=="200"){
      this.getHtml("https://logins.daum.net/accounts/srp.do?slevel=1&"+daumlogin.srp.init2(result),this.loginData[LOGIN_POST]);
      return false;
    }
    break;
  case ST_DATA:
    this.stage=ST_DATA_RES+1;
    this.getHtml("https://logins.daum.net/accounts/auth.gif");//set cookies
    return true;
  case ST_DATA_RES+1:
    this.stage=ST_DATA_RES;
    this.getHtml(this.dataURL);
    return true;
  }
  return this.baseProcess(aData,aHttp);
}

function getData(aData){
  var obj={}
  var fnd=aData.match(/folderList:\[([\s\S]+?)\]\s*}/);
  if(fnd){
    var ar=[];
    var num=0;
    var re=/{.+?\'name\':\"(.+?)\".+?\'newCount'\:(\d+)/g;
    var o;
    while ((o = re.exec(fnd[1])) != null){
      if(o[1]=="\\uBCF4\\uB0B8\\uD3B8\\uC9C0\\uD568")continue;
      if(o[1]=="\\uC784\\uC2DC\\uBCF4\\uAD00\\uD568")continue;
      if(o[1]=="\\uC2A4\\uD338\\uD3B8\\uC9C0\\uD568")continue;
      if(o[1]=="\\uD734\\uC9C0\\uD1B5")continue;
      if(o[1]==":\\uC218\\uC2E0\\uD655\\uC778:")continue;
      if(o[1]==":UNREAD:")continue;
      var n=0
      if(o[2])n=parseInt(o[2]);
      if(this.inboxOnly){
        if(o[1]=="\\uBC1B\\uC740\\uD3B8\\uC9C0\\uD568")num=n;
      }else num+=n;
      if(n>0&&o[1]!="\\uBC1B\\uC740\\uD3B8\\uC9C0\\uD568"){
        var name=unescape(o[1].replace(/\\/g,"%"));
        ar.push({id:name,count:n});
      }
    }
    this.count=num;
    if(this.showFolders){
      if(ar)obj.folders=ar;
    }
    return obj;
  }else{
    this.count=-1;
    return obj;
  }
}
function getViewURL(aFolder){
  if(aFolder){
    return "http://mail.daum.net/hanmail/Index.daum?COMMAND=list&FOLDER="+encodeURIComponent(aFolder);
  }
  return this.viewURL;
}


/*---- SHA-256 ------------------------------------------*/
var daumlogin = {};
(function() {
    function k(c) {
        var p = function(w) {
            var m = function(r, D, B, t, s, C) {
                while (--C >= 0) {
                    var q = D * this[r++] + B[t] + s;
                    s = Math.floor(q / 67108864);
                    B[t++] = q & 67108863
                }
                return s
            };
            var n = function(K, F, q, L, I, s) {
                var J = F & 32767,
                    G = F >> 15;
                while (--s >= 0) {
                    var t = this[K] & 32767;
                    var r = this[K++] >> 15;
                    var H = G * t + r * J;
                    t = J * t + ((H & 32767) << 15) + q[L] + (I & 1073741823);
                    I = (t >>> 30) + (H >>> 15) + G * r + (I >>> 30);
                    q[L++] = t & 1073741823
                }
                return I
            };
            var u = function(K, F, q, L, I, s) {
                var J = F & 16383,
                    G = F >> 14;
                while (--s >= 0) {
                    var t = this[K] & 16383;
                    var r = this[K++] >> 14;
                    var H = G * t + r * J;
                    t = J * t + ((H & 16383) << 14) + q[L] + I;
                    I = (t >> 28) + (H >> 14) + G * r;
                    q[L++] = t & 268435455
                }
                return I
            };
            var v = 244837814094590;
            var x = ((v & 16777215) == 15715070);
            if (true) {
                w.prototype.am = n;
                w.dbits = 30;
                w.log("AM_INIT MODIFICATION SUCCEEDED.")
            } else {
                if (x && (navigator.appName == "Microsoft Internet Explorer")) {
                    w.prototype.am = n;
                    w.dbits = 30
                } else {
                    if (x && (navigator.appName != "Netscape")) {
                        w.prototype.am = m;
                        w.dbits = 26
                    } else {
                        w.prototype.am = u;
                        w.dbits = 28
                    }
                }
            }
            w.BI_FP = 52;
            w.DB = w.dbits;
            w.DM = (1 << w.DB) - 1;
            w.DV = (1 << w.DB);
            w.FV = Math.pow(2, w.BI_FP);
            w.F1 = w.BI_FP - w.DB;
            w.F2 = 2 * w.DB - w.BI_FP
        };
        var e = function(m) {
            this.m = m;
            this.convert = function(n) {
                if (n.s < 0 || n.compareTo(this.m) >= 0) {
                    return n.mod(this.m)
                } else {
                    return n
                }
            }
        };
        e.prototype.revert = function(m) {
            return m
        };
        e.prototype.reduce = function(m) {
            m.divRemTo(this.m, null, m)
        };
        e.prototype.mulTo = function(n, r, m) {
            n.multiplyTo(r, m);
            this.reduce(m)
        };
        e.prototype.sqrTo = function(n, m) {
            n.squareTo(m);
            this.reduce(m)
        };
        e.prototype.toString = function() {
            return "Classic()"
        };
        var d = function(m) {
            this.m = m;
            this.mp = m.invDigit();
            this.mpl = this.mp & 32767;
            this.mph = this.mp >> 15;
            this.um = (1 << (a.DB - 15)) - 1;
            this.mt2 = 2 * m.t
        };
        d.prototype.convert = function(n) {
            var m = new a();
            n.abs().dlShiftTo(this.m.t, m);
            m.divRemTo(this.m, null, m);
            if (n.s < 0 && m.compareTo(a.ZERO) > 0) {
                this.m.subTo(m, m)
            }
            return m
        };
        d.prototype.revert = function(n) {
            var m = new a();
            n.copyTo(m);
            this.reduce(m);
            return m
        };
        d.prototype.reduce = function(t) {
            while (t.t <= this.mt2) {
                t[t.t++] = 0
            }
            for (var n = 0; n < this.m.t; ++n) {
                var s = t[n] & 32767;
                var m = (s * this.mpl + (((s * this.mph + (t[n] >> 15) * this.mpl) & this.um) << 15)) & a.DM;
                s = n + this.m.t;
                t[s] += this.m.am(0, m, t, n, 0, this.m.t);
                while (t[s] >= a.DV) {
                    t[s] -= a.DV;
                    s++;
                    t[s] ++
                }
            }
            t.clamp();
            t.drShiftTo(this.m.t, t);
            if (t.compareTo(this.m) >= 0) {
                t.subTo(this.m, t)
            }
        };
        d.prototype.sqrTo = function(n, m) {
            n.squareTo(m);
            this.reduce(m)
        };
        d.prototype.mulTo = function(n, r, m) {
            n.multiplyTo(r, m);
            this.reduce(m)
        };
        d.prototype.toString = function() {
            return "Montgomery()"
        };
        var a = function() {
            if (arguments.length == 0) {} else {
                if (arguments.length == 1) {
                    var w = arguments[0];
                    var u = typeof w;
                    if ("number" == u) {
                        if ((-1 * a.DV <= w) && (w < a.DV)) {
                            this.fromInt(w)
                        } else {
                            this.fromString(w.toString(16), 16)
                        }
                    } else {
                        if ("string" == u) {
                            this.fromString(w, 10)
                        } else {
                            this.fromByteArray(w)
                        }
                    }
                } else {
                    if (arguments.length == 2) {
                        var w = arguments[0];
                        var u = typeof w;
                        var m = arguments[1];
                        var v = typeof m;
                        if ("number" == u) {
                            this.fromNumber2(w, m)
                        } else {
                            if ("string" == u) {
                                this.fromString(w, m)
                            } else {
                                throw "parameter(1) must be either a number or a string. " + u
                            }
                        }
                    } else {
                        if (arguments.length == 3) {
                            var w = arguments[0];
                            var u = typeof w;
                            var m = arguments[1];
                            var v = typeof m;
                            var n = arguments[2];
                            var x = typeof n;
                            if ("number" == u) {
                                this.fromNumber1(w, m, n)
                            } else {
                                throw "parameter(1) must be a number. " + u
                            }
                        }
                    }
                }
            }
        };
        a.prototype.className = "BigInteger";
        var f = new Array();
        var b = function() {
            var n, m;
            n = "0".charCodeAt(0);
            for (m = 0; m <= 9; ++m) {
                f[n++] = m
            }
            n = "a".charCodeAt(0);
            for (m = 10; m < 36; ++m) {
                f[n++] = m
            }
            n = "A".charCodeAt(0);
            for (m = 10; m < 36; ++m) {
                f[n++] = m
            }
        };
        b();
        a.intAt = function(m, n) {
            var r = f[m.charCodeAt(n)];
            return (r == null) ? -1 : r
        };
        var o = "0123456789abcdefghijklmnopqrstuvwxyz";
        a.int2char = function(m) {
            return o.charAt(m)
        };
        a.nbits = function(n) {
            var r = 1,
                m;
            if ((m = n >>> 16) != 0) {
                n = m;
                r += 16
            }
            if ((m = n >> 8) != 0) {
                n = m;
                r += 8
            }
            if ((m = n >> 4) != 0) {
                n = m;
                r += 4
            }
            if ((m = n >> 2) != 0) {
                n = m;
                r += 2
            }
            if ((m = n >> 1) != 0) {
                n = m;
                r += 1
            }
            return r
        };
        a.prototype.copyTo = function(m) {
            for (var n = this.t - 1; n >= 0; --n) {
                m[n] = this[n]
            }
            m.t = this.t;
            m.s = this.s
        };
        a.prototype.fromInt = function(m) {
            this.t = 1;
            this.s = (m < 0) ? -1 : 0;
            if (m > 0) {
                this[0] = m
            } else {
                if (m < -1) {
                    this[0] = m + a.DV
                } else {
                    this.t = 0
                }
            }
        };
        a.prototype.fromString = function(m, y) {
            var w;
            if (y <= 0) {
                throw "bitLength must be larger than 0"
            } else {
                if (y == 2) {
                    w = 1
                } else {
                    if (y == 4) {
                        w = 2
                    } else {
                        if (y == 8) {
                            w = 3
                        } else {
                            if (y == 16) {
                                w = 4
                            } else {
                                if (y == 32) {
                                    w = 5
                                } else {
                                    if (y == 256) {
                                        w = 8
                                    } else {
                                        this.fromRadix(m, y);
                                        return
                                    }
                                }
                            }
                        }
                    }
                }
            }
            this.t = 0;
            this.s = 0;
            var n = m.length;
            var x = false;
            var s = 0;
            while (--n >= 0) {
                var z = (w == 8) ? m[n] & 255 : a.intAt(m, n);
                if (z < 0) {
                    if (m.charAt(n) == "-") {
                        x = true
                    }
                    continue
                }
                x = false;
                if (s == 0) {
                    this[this.t++] = z
                } else {
                    if (s + w > a.DB) {
                        this[this.t - 1] |= (z & ((1 << (a.DB - s)) - 1)) << s;
                        this[this.t] = (z >> (a.DB - s));
                        this.t++
                    } else {
                        this[this.t - 1] |= z << s
                    }
                }
                s += w;
                if (s >= a.DB) {
                    s -= a.DB
                }
            }
            if (w == 8 && (m[0] & 128) != 0) {
                this.s = -1;
                if (s > 0) {
                    this[this.t - 1] |= ((1 << (a.DB - s)) - 1) << s
                }
            }
            this.clamp();
            if (x) {
                a.ZERO.subTo(this, this)
            }
        };
        a.prototype.fromByteArray = function(m) {
            return this.fromString(m, 256)
        };
        a.prototype.clamp = function() {
            var m = this.s & a.DM;
            while (this.t > 0 && this[this.t - 1] == m) {
                --this.t
            }
        };
        a.prototype.toString = function(z) {
            if (this.s < 0) {
                return "-" + this.negate().toString(z)
            }
            var x;
            if (z == 16) {
                x = 4
            } else {
                return this.toRadix(z)
            }
            var A = (1 << x) - 1,
                B, m = false,
                n = "",
                r = this.t;
            var y = a.DB - (r * a.DB) % x;
            if (r-- > 0) {
                if (y < a.DB && (B = this[r] >> y) > 0) {
                    m = true;
                    n = a.int2char(B)
                }
                while (r >= 0) {
                    if (y < x) {
                        B = (this[r] & ((1 << y) - 1)) << (x - y);
                        B |= this[--r] >> (y += a.DB - x)
                    } else {
                        B = (this[r] >> (y -= x)) & A;
                        if (y <= 0) {
                            y += a.DB;
                            --r
                        }
                    } if (B > 0) {
                        m = true
                    }
                    if (m) {
                        n += a.int2char(B)
                    }
                }
            }
            return m ? n : "0"
        };
        a.prototype.negate = function() {
            var m = new a();
            a.ZERO.subTo(this, m);
            return m
        };
        a.prototype.abs = function() {
            return (this.s < 0) ? this.negate() : this
        };
        a.prototype.compareTo = function(n) {
            var r = this.s - n.s;
            if (r != 0) {
                return r
            }
            var m = this.t;
            r = m - n.t;
            if (r != 0) {
                return r
            }
            while (--m >= 0) {
                if ((r = this[m] - n[m]) != 0) {
                    return r
                }
            }
            return 0
        };
        a.prototype.bitLength = function() {
            if (this.t <= 0) {
                return 0
            }
            return a.DB * (this.t - 1) + a.nbits(this[this.t - 1] ^ (this.s & a.DM))
        };
        a.prototype.dlShiftTo = function(r, m) {
            var n;
            for (n = this.t - 1; n >= 0; --n) {
                m[n + r] = this[n]
            }
            for (n = r - 1; n >= 0; --n) {
                m[n] = 0
            }
            m.t = this.t + r;
            m.s = this.s
        };
        a.prototype.drShiftTo = function(r, m) {
            for (var n = r; n < this.t; ++n) {
                m[n - r] = this[n]
            }
            m.t = Math.max(this.t - r, 0);
            m.s = this.s
        };
        a.prototype.lShiftTo = function(x, z) {
            var A = x % a.DB;
            var m = a.DB - A;
            var B = (1 << m) - 1;
            var n = Math.floor(x / a.DB),
                r = (this.s << A) & a.DM,
                y;
            for (y = this.t - 1; y >= 0; --y) {
                z[y + n + 1] = (this[y] >> m) | r;
                r = (this[y] & B) << A
            }
            for (y = n - 1; y >= 0;
                --y) {
                z[y] = 0
            }
            z[n] = r;
            z.t = this.t + n + 1;
            z.s = this.s;
            z.clamp()
        };
        a.prototype.rShiftTo = function(m, y) {
            y.s = this.s;
            var r = Math.floor(m / a.DB);
            if (r >= this.t) {
                y.t = 0;
                return
            }
            var w = m % a.DB;
            var z = a.DB - w;
            var n = (1 << w) - 1;
            y[0] = this[r] >> w;
            for (var x = r + 1; x < this.t; ++x) {
                y[x - r - 1] |= (this[x] & n) << z;
                y[x - r] = this[x] >> w
            }
            if (w > 0) {
                y[this.t - r - 1] |= (this.s & n) << z
            }
            y.t = this.t - r;
            y.clamp()
        };
        a.prototype.subTo = function(r, m) {
            var n = 0,
                v = 0,
                u = Math.min(r.t, this.t);
            while (n < u) {
                v += this[n] - r[n];
                m[n++] = v & a.DM;
                v >>= a.DB
            }
            if (r.t < this.t) {
                v -= r.s;
                while (n < this.t) {
                    v += this[n];
                    m[n++] = v & a.DM;
                    v >>= a.DB
                }
                v += this.s
            } else {
                v += this.s;
                while (n < r.t) {
                    v -= r[n];
                    m[n++] = v & a.DM;
                    v >>= a.DB
                }
                v -= r.s
            }
            m.s = (v < 0) ? -1 : 0;
            if (v < -1) {
                m[n++] = a.DV + v
            } else {
                if (v > 0) {
                    m[n++] = v
                }
            }
            m.t = n;
            m.clamp()
        };
        a.prototype.multiplyTo = function(r, m) {
            var u = this.abs(),
                v = r.abs();
            var n = u.t;
            m.t = n + v.t;
            while (--n >= 0) {
                m[n] = 0
            }
            for (n = 0; n < v.t; ++n) {
                m[n + u.t] = u.am(0, v[n], m, n, 0, u.t)
            }
            m.s = 0;
            m.clamp();
            if (this.s != r.s) {
                a.ZERO.subTo(m, m)
            }
        };
        a.prototype.squareTo = function(n) {
            var t = this.abs();
            var r = n.t = 2 * t.t;
            while (--r >= 0) {
                n[r] = 0
            }
            for (r = 0; r < t.t - 1; ++r) {
                var m = t.am(r, t[r], n, 2 * r, 0, 1);
                if ((n[r + t.t] += t.am(r + 1, 2 * t[r], n, 2 * r + 1, m, t.t - r - 1)) >= a.DV) {
                    n[r + t.t] -= a.DV;
                    n[r + t.t + 1] = 1
                }
            }
            if (n.t > 0) {
                n[n.t - 1] += t.am(r, t[r], n, 2 * r, 0, 1)
            }
            n.s = 0;
            n.clamp()
        };
        a.prototype.divRemTo = function(t, Q, r) {
            var V = t.abs();
            if (V.t <= 0) {
                return
            }
            var S = this.abs();
            if (S.t < V.t) {
                if (Q != null) {
                    Q.fromInt(0)
                }
                if (r != null) {
                    this.copyTo(r)
                }
                return
            }
            if (r == null) {
                r = new a()
            }
            var M = new a(),
                X = this.s,
                n = t.s;
            var N = a.DB - a.nbits(V[V.t - 1]);
            if (N > 0) {
                V.lShiftTo(N, M);
                S.lShiftTo(N, r)
            } else {
                V.copyTo(M);
                S.copyTo(r)
            }
            var q = M.t;
            var W = M[q - 1];
            if (W == 0) {
                return
            }
            var T = W * (1 << a.F1) + ((q > 1) ? M[q - 2] >> a.F2 : 0);
            var m = a.FV / T,
                L = (1 << a.F1) / T,
                P = 1 << a.F2;
            var R = r.t,
                y = R - q,
                O = (Q == null) ? new a() : Q;
            M.dlShiftTo(y, O);
            if (r.compareTo(O) >= 0) {
                r[r.t++] = 1;
                r.subTo(O, r)
            }
            a.ONE.dlShiftTo(q, O);
            O.subTo(M, M);
            while (M.t < q) {
                M[M.t++] = 0
            }
            while (--y >= 0) {
                var U = (r[--R] == W) ? a.DM : Math.floor(r[R] * m + (r[R - 1] + P) * L);
                if ((r[R] += M.am(0, U, r, y, 0, q)) < U) {
                    M.dlShiftTo(y, O);
                    r.subTo(O, r);
                    while (r[R] < --U) {
                        r.subTo(O, r)
                    }
                }
            }
            if (Q != null) {
                r.drShiftTo(q, Q);
                if (X != n) {
                    a.ZERO.subTo(Q, Q)
                }
            }
            r.t = q;
            r.clamp();
            if (N > 0) {
                r.rShiftTo(N, r)
            }
            if (X < 0) {
                a.ZERO.subTo(r, r)
            }
        };
        a.prototype.mod = function(n) {
            var m = new a();
            this.abs().divRemTo(n, null, m);
            if (this.s < 0 && m.compareTo(a.ZERO) > 0) {
                n.subTo(m, m)
            }
            return m
        };
        a.prototype.invDigit = function() {
            if (this.t < 1) {
                return 0
            }
            var n = this[0];
            if ((n & 1) == 0) {
                return 0
            }
            var m = n & 3;
            m = (m * (2 - (n & 15) * m)) & 15;
            m = (m * (2 - (n & 255) * m)) & 255;
            m = (m * (2 - (((n & 65535) * m) & 65535))) & 65535;
            m = (m * (2 - n * m % a.DV)) % a.DV;
            return (m > 0) ? a.DV - m : -m
        };
        a.prototype.isEven = function() {
            return ((this.t > 0) ? (this[0] & 1) : this.s) == 0
        };
        a.log = function(m) {
            return
        };
        a.err = function(m) {
            trace(m);
            return
        };
        a.ZERO = new a(0);
        a.ONE = new a(1);
        p(a);
        a.Classic = e;
        a.Montgomery = d;
        return a
    }

    function l(c) {
        var a = c;
        a.prototype.chunkSize = function(e) {
            return Math.floor(Math.LN2 * a.DB / Math.log(e))
        };
        a.prototype.fromRadix = function(w, z) {
            this.fromInt(0);
            var f = this.chunkSize(z);
            var e = Math.pow(z, f);
            var s = false;
            var v = 0;
            var x = 0;
            for (var u = 0; u < w.length; ++u) {
                var y = a.intAt(w, u);
                if (y < 0) {
                    if (w.charAt(u) == "-" && this.signum() == 0) {
                        s = true
                    }
                    continue
                }
                x = z * x + y;
                if (++v >= f) {
                    this.dMultiply(e);
                    this.dAddOffset(x, 0);
                    v = 0;
                    x = 0
                }
            }
            if (v > 0) {
                this.dMultiply(Math.pow(z, v));
                this.dAddOffset(x, 0)
            }
            if (s) {
                a.ZERO.subTo(this, this)
            }
        };
        var b = 0;
        a.prototype.fromNumber2 = function(e, f) {
            var p = new Array();
            var o = e & 7;
            p.length = (e >> 3) + 1;
            f.nextBytes(p);
            if (o > 0) {
                p[0] &= ((1 << o) - 1)
            } else {
                p[0] = 0
            }
            this.fromString(p, 256)
        };
        a.prototype.equals = function(e) {
            return (this.compareTo(e) == 0)
        };
        a.prototype.min = function(e) {
            return (this.compareTo(e) < 0) ? this : e
        };
        a.prototype.max = function(e) {
            return (this.compareTo(e) > 0) ? this : e
        };
        a.prototype.bitwiseTo = function(s, t, f) {
            var r, m, e = Math.min(s.t, this.t);
            for (r = 0; r < e; ++r) {
                f[r] = t(this[r], s[r])
            }
            if (s.t < this.t) {
                m = s.s & a.DM;
                for (r = e; r < this.t; ++r) {
                    f[r] = t(this[r], m)
                }
                f.t = this.t
            } else {
                m = this.s & a.DM;
                for (r = e; r < s.t; ++r) {
                    f[r] = t(m, s[r])
                }
                f.t = s.t
            }
            f.s = t(this.s, s.s);
            f.clamp()
        };
        a.op_xor = function(f, e) {
            return f ^ e
        };
        a.prototype.ope_xor = function(f) {
            var e = new a();
            this.bitwiseTo(f, a.op_xor, e);
            return e
        };
        a.prototype.xor = a.prototype.ope_xor;
        a.prototype.addTo = function(q, e) {
            var r = 0,
                m = 0,
                f = Math.min(q.t, this.t);
            while (r < f) {
                m += this[r] + q[r];
                e[r++] = m & a.DM;
                m >>= a.DB
            }
            if (q.t < this.t) {
                m += q.s;
                while (r < this.t) {
                    m += this[r];
                    e[r++] = m & a.DM;
                    m >>= a.DB
                }
                m += this.s
            } else {
                m += this.s;
                while (r < q.t) {
                    m += q[r];
                    e[r++] = m & a.DM;
                    m >>= a.DB
                }
                m += q.s
            }
            e.s = (m < 0) ? -1 : 0;
            if (m > 0) {
                e[r++] = m
            } else {
                if (m < -1) {
                    e[r++] = a.DV + m
                }
            }
            e.t = r;
            e.clamp()
        };
        a.prototype.ope_add = function(f) {
            var e = new a();
            this.addTo(f, e);
            return e
        };
        a.prototype.add = a.prototype.ope_add;
        a.prototype.ope_subtract = function(f) {
            var e = new a();
            this.subTo(f, e);
            return e
        };
        a.prototype.subtract = a.prototype.ope_subtract;
        a.prototype.ope_multiply = function(f) {
            var e = new a();
            this.multiplyTo(f, e);
            return e
        };
        a.prototype.multiply = a.prototype.ope_multiply;
        a.prototype.dMultiply = function(e) {
            this[this.t] = this.am(0, e - 1, this, 0, 0, this.t);
            ++this.t;
            this.clamp()
        };
        a.prototype.dAddOffset = function(e, f) {
            while (this.t <= f) {
                this[this.t++] = 0
            }
            this[f] += e;
            while (this[f] >= a.DV) {
                this[f] -= a.DV;
                if (++f >= this.t) {
                    this[this.t++] = 0
                }++this[f]
            }
        };
        var d = function() {
            this.convert = function(e) {
                return e
            };
            this.revert = function(e) {
                return e
            };
            this.mulTo = function(e, f, n) {
                e.multiplyTo(f, n)
            };
            this.sqrTo = function(f, e) {
                f.squareTo(e)
            }
        };
        a.prototype.modPow = function(N, r) {
            var H = N.bitLength(),
                m, w = new a(1),
                e;
            if (H <= 0) {
                return w
            } else {
                if (H < 18) {
                    m = 1
                } else {
                    if (H < 48) {
                        m = 3
                    } else {
                        if (H < 144) {
                            m = 4
                        } else {
                            if (H < 768) {
                                m = 5
                            } else {
                                m = 6
                            }
                        }
                    }
                }
            } if (H < 8) {
                e = new a.Classic(r)
            } else {
                if (r.isEven()) {
                    e = new a.Barrett(r)
                } else {
                    e = new a.Montgomery(r)
                }
            }
            var f = new Array(),
                K = 3,
                M = m - 1,
                G = (1 << m) - 1;
            f[1] = e.convert(this);
            if (m > 1) {
                var n = new a();
                e.sqrTo(f[1], n);
                while (K <= G) {
                    f[K] = new a();
                    e.mulTo(n, f[K - 2], f[K]);
                    K += 2
                }
            }
            var I = N.t - 1,
                z, t = true,
                L = new a(),
                J;
            H = a.nbits(N[I]) - 1;
            while (I >= 0) {
                if (H >= M) {
                    z = (N[I] >> (H - M)) & G
                } else {
                    z = (N[I] & ((1 << (H + 1)) - 1)) << (M - H);
                    if (I > 0) {
                        z |= N[I - 1] >> (a.DB + H - M)
                    }
                }
                K = m;
                while ((z & 1) == 0) {
                    z >>= 1;
                    --K
                }
                if ((H -= K) < 0) {
                    H += a.DB;
                    --I
                }
                if (t) {
                    f[z].copyTo(w);
                    t = false
                } else {
                    while (K > 1) {
                        e.sqrTo(w, L);
                        e.sqrTo(L, w);
                        K -= 2
                    }
                    if (K > 0) {
                        e.sqrTo(w, L)
                    } else {
                        J = w;
                        w = L;
                        L = J
                    }
                    e.mulTo(L, f[z], w)
                }
                while (I >= 0 && (N[I] & (1 << H)) == 0) {
                    e.sqrTo(w, L);
                    J = w;
                    w = L;
                    L = J;
                    if (--H < 0) {
                        H = a.DB - 1;
                        --I
                    }
                }
            }
            return e.revert(w)
        };
        a.NullExp = d
    }

    function h(v) {
        function f(o, p, n, m) {
            this.variant = o;
            this.shaFunc = p;
            this.inputFunc = n;
            this.outputFunc = m
        }

        function B(m) {
            return m
        }

        function x(m) {
            var p = m.length << 2;
            var o = new Array(p);
            for (var q = 0, n = 0; q < m.length && n < o.length;) {
                o[n++] = 255 & (m[q] >> 24);
                o[n++] = 255 & (m[q] >> 16);
                o[n++] = 255 & (m[q] >> 8);
                o[n++] = 255 & (m[q] >> 0);
                q++
            }
            return o
        }

        function d(o) {
            var p = (o.length + 3) >> 2;
            var m = new Array(p);
            for (var q = 0, n = 0; q < m.length && n < o.length;) {
                m[q++] = (n < o.length ? (o[n++] << 24) : 0) | (n < o.length ? (o[n++] << 16) : 0) | (n < o.length ? (o[n++] << 8) : 0) | (n < o.length ? (o[n++]) : 0)
            }
            return m
        }

        function e(m) {
            return v.str2utf8(m)
        }

        function z(m) {
            return base16_decode(m)
        }

        function b(m) {
            return base64_encode(m)
        }
        var y = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
        var w = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

        function u(n, o) {
            var p = "";
            for (var r = 0; r < n.length; r++) {
                var q = n[r];
                for (var m = 28; 0 <= m; m -= 4) {
                    p += o[(15 & (q >> m))]
                }
            }
            return p
        }

        function A(m) {
            return u(m, w)
        }

        function a(n, p, q) {
            var m = null;
            var r = null;
            if (p == null) {
                m = B
            } else {
                if (typeof(p) == "function") {
                    m = p
                } else {
                    switch (p) {
                        case "BIN":
                        case "binary":
                            m = B;
                            break;
                        case "STR":
                        case "STR(UTF8)":
                        case "string":
                            m = e;
                            break;
                        case "HEX":
                        case "hex":
                            m = z;
                            break;
                        case "B64":
                        case "base64":
                            m = b;
                            break;
                        default:
                            throw "INPUT FORMAT NOT RECOGNIZED"
                    }
                }
            } if (q == null) {
                r = x
            } else {
                if (typeof(q) == "function") {
                    r = q
                } else {
                    switch (q) {
                        case "binary":
                        case "BIN":
                            r = x;
                            break;
                        case "STR":
                        case "STR(UTF8)":
                        case "string":
                            m = ia2str;
                        case "HEX":
                            r = ia2hex_upper;
                            break;
                        case "hex":
                            r = A;
                            break;
                        case "B64":
                        case "base64":
                            r = ia2b64;
                            break;
                        default:
                            throw "OUTPUT FORMAT NOT RECOGNIZED"
                    }
                }
            }
            var o = null;
            switch (n) {
                case "SHA-1":
                    o = v.sha.core.coreSHA1;
                    break;
                case "SHA-224":
                    o = v.sha.core.coreSHA2;
                    break;
                case "SHA-256":
                    o = v.sha.core.coreSHA2;
                    break;
                case "SHA-384":
                    o = v.sha.core.coreSHA2;
                    break;
                case "SHA-512":
                    o = v.sha.core.coreSHA2;
                    break;
                default:
                    throw "HASH NOT RECOGNIZED"
            }
            return new f(n, o, m, r)
        }

        function c(q) {
            var n = this.inputFunc(q);
            var o = n.length * 8;
            var p = d(n);
            var m = this.outputFunc(this.shaFunc(p, o, this.variant));
            return m
        }
        f.prototype.hash = c;
        f.create = a;
        return f
    }

    function i(a) {
        var e = function() {
            this.i = 0;
            this.j = 0;
            this.S = new Array()
        };
        e.prototype.init = function(m) {
            var r, t, s;
            for (r = 0; r < 256; ++r) {
                this.S[r] = r
            }
            t = 0;
            for (r = 0; r < 256; ++r) {
                t = (t + this.S[r] + m[r % m.length]) & 255;
                s = this.S[r];
                this.S[r] = this.S[t];
                this.S[t] = s
            }
            this.i = 0;
            this.j = 0
        };
        e.prototype.next = function() {
            var m;
            this.i = (this.i + 1) & 255;
            this.j = (this.j + this.S[this.i]) & 255;
            m = this.S[this.i];
            this.S[this.i] = this.S[this.j];
            this.S[this.j] = m;
            return this.S[(m + this.S[this.i]) & 255]
        };
        e.create = function() {
            return new e()
        };
        e.rng_psize = 256;
        var f = null;
        var c = [];
        var d = 0;
        rng_seed_int = function(m) {
            c[d] ^= m & 255;
            d++;
            c[d] ^= (m >> 8) & 255;
            d++;
            c[d] ^= (m >> 16) & 255;
            d++;
            c[d] ^= (m >> 24) & 255;
            d++;
            if (d >= e.rng_psize) {
                d -= e.rng_psize
            }
        };
        rng_seed_time = function() {
            rng_seed_int(new Date().getTime())
        };
        pool_init = function() {
            var m;
            while (d < e.rng_psize) {
                m = Math.floor(65536 * Math.random());
                c[d++] = m >>> 8;
                c[d++] = m & 255
            }
            d = 0;
            rng_seed_time()
        };
        var b = function() {
            if (f == null) {
                rng_seed_time();
                f = e.create();
                f.init(c);
                for (d = 0; d < c.length; ++d) {
                    c[d] = 0
                }
                d = 0
            }
            return f.next()
        };
        var n = function() {};
        n.prototype.nextBytes = function(m) {
            for (var p = 0; p < m.length; ++p) {
                m[p] = b()
            }
        };
        pool_init();
        return n
    }

    function j(f) {
        var s = {};
        s.core = {};

        function c(n, m) {
            if (m < 32) {
                return (n >>> m) | (n << (32 - m))
            } else {
                return n
            }
        }

        function v(n, m) {
            if (m < 32) {
                return n >>> m
            } else {
                return 0
            }
        }

        function a(n, o, m) {
            return (n & o) ^ (~n & m)
        }

        function x(n, o, m) {
            return (n & o) ^ (n & m) ^ (o & m)
        }

        function b(m) {
            return c(m, 2) ^ c(m, 13) ^ c(m, 22)
        }

        function e(m) {
            return c(m, 6) ^ c(m, 11) ^ c(m, 25)
        }

        function u(m) {
            return c(m, 7) ^ c(m, 18) ^ v(m, 3)
        }

        function w(m) {
            return c(m, 17) ^ c(m, 19) ^ v(m, 10)
        }

        function t(p, m) {
            var n = (p & 65535) + (m & 65535);
            var o = (p >>> 16) + (m >>> 16) + (n >>> 16);
            return ((o & 65535) << 16) | (n & 65535)
        }

        function d(af, W, aa) {
            var ab = [];
            var ar, ah, K, ad, m, at, q, n;
            var aq, ak;
            var ae;
            var aj, av, aw, am;
            var p, ai, ac, o, r, au, ao, al;
            var H;
            if (aa === "SHA-224" || aa === "SHA-256") {
                aj = 64;
                av = ((W + 1 + 64 >> 9) << 4) + 15;
                aw = 16;
                am = 1;
                al = Number;
                p = t;
                ai = u;
                ac = w;
                o = b;
                r = e;
                ao = x;
                au = a;
                H = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
                if (aa === "SHA-224") {
                    ae = [3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025, 1694076839, 3204075428]
                } else {
                    ae = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]
                }
            } else {
                if (aa === "SHA-384" || aa === "SHA-512") {
                    aj = 80;
                    av = ((W + 1 + 128 >> 10) << 5) + 31;
                    aw = 32;
                    am = 2;
                    al = Int_64;
                    ai = gamma0_64;
                    ac = gamma1_64;
                    o = sigma0_64;
                    r = sigma1_64;
                    ao = maj_64;
                    au = ch_64;
                    H = [new Int_64(1116352408, 3609767458), new Int_64(1899447441, 602891725), new Int_64(3049323471, 3964484399), new Int_64(3921009573, 2173295548), new Int_64(961987163, 4081628472), new Int_64(1508970993, 3053834265), new Int_64(2453635748, 2937671579), new Int_64(2870763221, 3664609560), new Int_64(3624381080, 2734883394), new Int_64(310598401, 1164996542), new Int_64(607225278, 1323610764), new Int_64(1426881987, 3590304994), new Int_64(1925078388, 4068182383), new Int_64(2162078206, 991336113), new Int_64(2614888103, 633803317), new Int_64(3248222580, 3479774868), new Int_64(3835390401, 2666613458), new Int_64(4022224774, 944711139), new Int_64(264347078, 2341262773), new Int_64(604807628, 2007800933), new Int_64(770255983, 1495990901), new Int_64(1249150122, 1856431235), new Int_64(1555081692, 3175218132), new Int_64(1996064986, 2198950837), new Int_64(2554220882, 3999719339), new Int_64(2821834349, 766784016), new Int_64(2952996808, 2566594879), new Int_64(3210313671, 3203337956), new Int_64(3336571891, 1034457026), new Int_64(3584528711, 2466948901), new Int_64(113926993, 3758326383), new Int_64(338241895, 168717936), new Int_64(666307205, 1188179964), new Int_64(773529912, 1546045734), new Int_64(1294757372, 1522805485), new Int_64(1396182291, 2643833823), new Int_64(1695183700, 2343527390), new Int_64(1986661051, 1014477480), new Int_64(2177026350, 1206759142), new Int_64(2456956037, 344077627), new Int_64(2730485921, 1290863460), new Int_64(2820302411, 3158454273), new Int_64(3259730800, 3505952657), new Int_64(3345764771, 106217008), new Int_64(3516065817, 3606008344), new Int_64(3600352804, 1432725776), new Int_64(4094571909, 1467031594), new Int_64(275423344, 851169720), new Int_64(430227734, 3100823752), new Int_64(506948616, 1363258195), new Int_64(659060556, 3750685593), new Int_64(883997877, 3785050280), new Int_64(958139571, 3318307427), new Int_64(1322822218, 3812723403), new Int_64(1537002063, 2003034995), new Int_64(1747873779, 3602036899), new Int_64(1955562222, 1575990012), new Int_64(2024104815, 1125592928), new Int_64(2227730452, 2716904306), new Int_64(2361852424, 442776044), new Int_64(2428436474, 593698344), new Int_64(2756734187, 3733110249), new Int_64(3204031479, 2999351573), new Int_64(3329325298, 3815920427), new Int_64(3391569614, 3928383900), new Int_64(3515267271, 566280711), new Int_64(3940187606, 3454069534), new Int_64(4118630271, 4000239992), new Int_64(116418474, 1914138554), new Int_64(174292421, 2731055270), new Int_64(289380356, 3203993006), new Int_64(460393269, 320620315), new Int_64(685471733, 587496836), new Int_64(852142971, 1086792851), new Int_64(1017036298, 365543100), new Int_64(1126000580, 2618297676), new Int_64(1288033470, 3409855158), new Int_64(1501505948, 4234509866), new Int_64(1607167915, 987167468), new Int_64(1816402316, 1246189591)];
                    if (aa === "SHA-384") {
                        ae = [new Int_64(3418070365, 3238371032), new Int_64(1654270250, 914150663), new Int_64(2438529370, 812702999), new Int_64(355462360, 4144912697), new Int_64(1731405415, 4290775857), new Int_64(41048885895, 1750603025), new Int_64(3675008525, 1694076839), new Int_64(1203062813, 3204075428)]
                    } else {
                        ae = [new Int_64(1779033703, 4089235720), new Int_64(3144134277, 2227873595), new Int_64(1013904242, 4271175723), new Int_64(2773480762, 1595750129), new Int_64(1359893119, 2917565137), new Int_64(2600822924, 725511199), new Int_64(528734635, 4215389547), new Int_64(1541459225, 327033209)]
                    }
                }
            }
            af[W >> 5] |= 128 << (24 - W % 32);
            af[av] = W;
            var an = af.length;
            for (var ap = 0; ap < an; ap += aw) {
                ar = ae[0];
                ah = ae[1];
                K = ae[2];
                ad = ae[3];
                m = ae[4];
                at = ae[5];
                q = ae[6];
                n = ae[7];
                for (var ag = 0; ag < aj; ag++) {
                    if (ag < 16) {
                        ab[ag] = new al(af[ag * am + ap], af[ag * am + ap + 1])
                    } else {
                        ab[ag] = p(p(p(ac(ab[ag - 2]), ab[ag - 7]), ai(ab[ag - 15])), ab[ag - 16])
                    }
                    aq = p(p(p(p(n, r(m)), au(m, at, q)), H[ag]), ab[ag]);
                    ak = p(o(ar), ao(ar, ah, K));
                    n = q;
                    q = at;
                    at = m;
                    m = p(ad, aq);
                    ad = K;
                    K = ah;
                    ah = ar;
                    ar = p(aq, ak)
                }
                ae[0] = p(ar, ae[0]);
                ae[1] = p(ah, ae[1]);
                ae[2] = p(K, ae[2]);
                ae[3] = p(ad, ae[3]);
                ae[4] = p(m, ae[4]);
                ae[5] = p(at, ae[5]);
                ae[6] = p(q, ae[6]);
                ae[7] = p(n, ae[7])
            }
            switch (aa) {
                case "SHA-224":
                    return [ae[0], ae[1], ae[2], ae[3], ae[4], ae[5], ae[6]];
                case "SHA-256":
                    return ae;
                case "SHA-384":
                    return [ae[0].highOrder, ae[0].lowOrder, ae[1].highOrder, ae[1].lowOrder, ae[2].highOrder, ae[2].lowOrder, ae[3].highOrder, ae[3].lowOrder, ae[4].highOrder, ae[4].lowOrder, ae[5].highOrder, ae[5].lowOrder];
                case "SHA-512":
                    return [ae[0].highOrder, ae[0].lowOrder, ae[1].highOrder, ae[1].lowOrder, ae[2].highOrder, ae[2].lowOrder, ae[3].highOrder, ae[3].lowOrder, ae[4].highOrder, ae[4].lowOrder, ae[5].highOrder, ae[5].lowOrder, ae[6].highOrder, ae[6].lowOrder, ae[7].highOrder, ae[7].lowOrder];
                default:
                    return []
            }
        }
        s.core.coreSHA2 = d;
        return s
    }

    function g(a) {
        function b(e) {
            var p = [];
            var f = e.length;
            var c = 0;
            for (var o = 0; o < f; o++) {
                var d = e.charCodeAt(o);
                if (d <= 127) {
                    p[c++] = d
                } else {
                    if (d <= 2047) {
                        p[c++] = B11000000 | (B00011111 & (d >>> 6));
                        p[c++] = B10000000 | (B00111111 & (d >>> 0))
                    } else {
                        if (d <= 65535) {
                            p[c++] = B11100000 | (B00001111 & (d >>> 12));
                            p[c++] = B10000000 | (B00111111 & (d >>> 6));
                            p[c++] = B10000000 | (B00111111 & (d >>> 0))
                        } else {
                            if (d <= 1114111) {
                                p[c++] = B11110000 | (B00000111 & (d >>> 18));
                                p[c++] = B10000000 | (B00111111 & (d >>> 12));
                                p[c++] = B10000000 | (B00111111 & (d >>> 6));
                                p[c++] = B10000000 | (B00111111 & (d >>> 0))
                            } else {
                                throw "error"
                            }
                        }
                    }
                }
            }
            return p
        }
        a.str2utf8 = b
    }
    daumlogin.crypto = {};
    daumlogin.crypto.BigInteger = k(daumlogin.crypto);
    l(daumlogin.crypto.BigInteger);
    g(daumlogin.crypto);
    daumlogin.crypto.sha = j(daumlogin.crypto);
    daumlogin.crypto.SHA = h(daumlogin.crypto);
    daumlogin.crypto.SecureRandom = i(daumlogin.crypto)
})();
daumlogin.srp = (function() {
    var c = daumlogin.crypto.BigInteger,
        t = daumlogin.crypto.SHA,
        w = daumlogin.crypto.SecureRandom,
        p = t.create("SHA-256", "string", "hex");
    var D = new c("115b8b692e0e045692cf280b436735c77a5a9e8a9e7ed56c965f87db5b2a2ece3", 16),
        u = new c("2"),
        n = new w();
    var l = {
            FORMID: "loginForm",
            USERID: "id",
            INPUTPWD: "inputPwd"
        },
        z = {
            DEFAULT: "https://logins.daum.net/accounts/login.do",
            mDEFAULT: "https://logins.daum.net/accounts/mobile.do",
            mobile: "https://logins.daum.net/accounts/msrp.do",
            SRP: "https://logins.daum.net/accounts/srp.do",
            NOSRP: "",
            PRESRP: "https://logins.daum.net/accounts/presrp.do",
            HTTP: "http://login.daum.net/accounts/presrp.do",
            NOCOOKIE: "https://logins.daum.net/accounts/invalidcookieguide",
            mNOCOOKIE: "https://logins.daum.net/accounts/invalidcookieguidemobile"
        },
        j = {},
        B = {
            timeout: 3000
        },
        r = false,
        GG,
        II,
        h;
    var a = null;

    function v() {
        var g = "";
        for (var F = 0; F < arguments.length; F++) {
            if (arguments[F] instanceof c) {
                g += arguments[F].toString(16)
            } else {
                g += arguments[F]
            }
        }
        return new c(p.hash(g), 16)
    }

    function e(G) {
        var F, g = [];
        for (F in G) {
            if (F.hasOwnProperty && G[F]) {
                g.push(F + "=" + G[F])
            }
        }
        return g.length > 0 ? g.join("&") : ""
    }

    function setValues(id,pw) {
        B.id = id;
        B.pw = pw;
    }

    function s() {
        var G = new c(16, n),
            I = u.modPow(G, D),
            F = e({
                id: escape(B.id),
                srpla: I.toString(16)
            }),
            H = new Date().getTime(),
            g = z.PRESRP + "?" + F;
      GG=G;
      II=I;
           return g;
    }

    function f(U, O, K) {
        var N = new Date().getTime(),
            Q, F;

        var T = new c(U.srpss, 16),
            M = new c(U.srplb, 16),
            g = v(D, u),
            R = v(O, M),
            J = v(T, B.pw),
            L = g.multiply(u.modPow(J, D)),
            G = M.subtract(L),
            H = R.multiply(J),
            I, S;
        if (new Date().getTime() - N > B.timeout / 3) {
            return false
        }
        I = G.modPow(K.add(H), D);
        S = v(I);
        var P = B.id;

        Q = v(v(D).xor(v(u)), v(P), T, O, M, S).toString(16);
        F = new Date().getTime() - N;
        return {
            time: F,
            key: Q
        }
    }

    return {
        init: function(id,pw) {
            h = null;
            j = {};
           setValues(id,pw);
           return s();
        },
        init2: function(G){
          var F = f(G, II, GG);
          j.rid = G.rid;
          j.srplm1 = F.key;
          return e(j);
        }
    }
})();
