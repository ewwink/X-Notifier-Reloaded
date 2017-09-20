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

const Ci=Components.interfaces;
const dout=Components.utils.reportError;

var script={
  onLoad:function(){
    this.appMain = Components.classes["@tobwithu.com/xnotifier;1"]
                .getService().wrappedJSObject;
    this.main=window.arguments[0];
    this.list=this.appMain.getScriptList({});
    this.list.sort();
    for(var o of this.list)this.addItem(o,this.appMain.getScriptVal(o,"ver"));
  },
  onAdd:function(){
    var fp = Components.classes["@mozilla.org/filepicker;1"]
    	           .createInstance(Ci.nsIFilePicker);
    fp.init(window, "Open",Ci.nsIFilePicker.modeOpen);
    fp.appendFilter ("Javascript","*.js");
    fp.appendFilters(Ci.nsIFilePicker.filterAll);

    fp.open((rv) => {
      if (rv == Ci.nsIFilePicker.returnOK)
      {
        var file=fp.file;
        var fname = file.leafName;
        var fnd=fname.match(/(.+)(\.\S+?)$/);
        if(fnd)fname=fnd[1];
        var str=this.appMain.loadFile0(file);
        Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService)
          .notifyObservers(null, "startupcache-invalidate", null);
        var inList=this.main.addScript(fname,str);
        var ver=this.appMain.getScriptVal(fname,"ver");
        if(!inList){
          this.list.push(fname);
          this.addItem(fname,ver);
        }else{
          var em=document.getElementById("id"+fname);
          em.setAttribute("label",fname+(ver?"("+ver+")":""));
        }
      }
    });
  },
  onDelete:function(){
    var obj=document.getElementById("xnotifier-scripts");
    var index=obj.selectedIndex;
    if(index<0)return;
    var o=this.list[index];
    this.list.splice(index,1);
    obj.removeItemAt(index);
    this.appMain.deleteFile("xnotifier/"+o+".js");
    if(o.indexOf("lib-")!=0){
      this.appMain.removeHost(o);
      this.main.removeHost(o);
    }
  },
  addItem:function(name,ver){
    var em = document.createElement("listitem");
      var ch = document.createElement("listcell");
      ch.setAttribute("label",name+(ver?"("+ver+")":""));
      ch.id="id"+name;
      em.appendChild(ch);
    document.getElementById("xnotifier-scripts").appendChild(em);
  },
  onClickLink:function(){
    this.appMain.openLink("http://xnotifier.tobwithu.com/scripts.php")
  }
}
