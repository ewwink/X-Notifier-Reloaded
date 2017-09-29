function SocketReader(callback,host,port,ssl) {
  this.connected=false;
  this.callback=callback;
  var transportService =
    Components.classes["@mozilla.org/network/socket-transport-service;1"]
      .getService(Components.interfaces.nsISocketTransportService);
/*   //      
  var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
  var uri = ios.newURI("https://"+host+":"+port, null, null);
  var pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"].getService();
  var pi=pps.resolve(uri,0);
 if(pi!=null&&pi.type.indexOf("sock")==-1)pi=null;
dout(pi);
dout(pi.type);*/
  //
  this.transport = transportService.createTransport(ssl?["ssl"]:null,ssl?1:0,host,port,null);
//  this.transport.setTimeout(Ci.nsISocketTransport.TIMEOUT_CONNECT,10);
  this.outstream = this.transport.openOutputStream(0,0,0);
  var stream = this.transport.openInputStream(0,0,0);
  this.instream = Components.classes["@mozilla.org/scriptableinputstream;1"]
    .createInstance(Components.interfaces.nsIScriptableInputStream);
  this.instream.init(stream);
  var pump = Components.
    classes["@mozilla.org/network/input-stream-pump;1"].
      createInstance(Components.interfaces.nsIInputStreamPump);
  try {
    // Bug 1402888 removed streamPos and streamLen parameters.
    pump.init(stream, 0, 0, false);
  } catch (err) {
    pump.init(stream, -1, -1, 0, 0, false);
  }
  pump.asyncRead(this,null);
}
SocketReader.prototype.write = function (data) {
  this.outstream.write(data,data.length);
}
SocketReader.prototype.onStartRequest = function (aRequest, aContext) {
}
SocketReader.prototype.onDataAvailable = function (aRequest, aContext, aStream, aSourceOffset, aLength){
  this.connected=true;
  var data=this.instream.read(aLength);
  if(this.callback)this.callback.processSocket(data);
}

SocketReader.prototype.onStopRequest = function (aRequest, aContext, aStatus) {
  this.close();  
  if(!this.connected&&this.callback)this.callback.processSocket("");
}
SocketReader.prototype.close = function () {
  this.instream.close();
  this.transport.close(Components.results.NS_BINDING_ABORTED);
}
