/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is X-notifier.
 *
 * The Initial Developer of the Original Code is
 * Byungwook Kang.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
function XNProtocolHandler() { }
XNProtocolHandler.prototype = {
  classDescription: "X-notifier Protocol Handler",
  classID:          Components.ID("{71522470-9f8d-11e2-9e96-0800200c9a66}"),
  contractID:       "@mozilla.org/network/protocol;1?name=xnotifier",
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIProtocolHandler]),
  newURI:function(spec, charset, baseURI){
    var uri = Components.classes["@mozilla.org/network/simple-uri;1"].createInstance(Components.interfaces.nsIURI);
    uri.spec = spec;
    return uri;
  },
  newChannel: function(aURI){
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);
    return ios.newChannel("chrome://xnotifier/content/bm.xul", null, null);
  }
};
var components = [XNProtocolHandler];
if ("generateNSGetFactory" in XPCOMUtils)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);  // Firefox 4.0 and higher
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);    // Firefox 3.x