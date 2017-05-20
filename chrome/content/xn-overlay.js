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
const dout=Components.utils.reportError;

var xnSb={
  accounts:null,
  init:function(){
    var tree=document.getElementById("placesList").lastChild;
    while(tree.firstChild != null)tree.removeChild(tree.firstChild);
    this.accounts=[];
    var n=this.main.getAccountsNumber();
    for(var i=0;i<n;i++){
      if(!this.main.isAccountEnabled(i))continue;
      var o=this.main.getAccountInfo(i);
      this.accounts.push(o);
      var groupId=o.id;
      var name=o.user;
      var noGroup=false;
      var aliasGroup=false;
      if(o.alias){
        var fnd=o.alias.match(/(.+?)\/(.*)/);
        if(fnd){
          aliasGroup=true;
          groupId=fnd[1];
          if(this.main.getAccountsInGroup(fnd[1])==1){
            noGroup=true;
            name=groupId;
          }else{
            name=fnd[2]?fnd[2]:o.user;
          }
        }else{
          name=o.alias;
        }
      }
      if(!aliasGroup&&this.main.getAccountsInHost(o.id)==1){
        noGroup=true;
        name=o.alias?o.alias:this.main.getHostName(o.id);
      }
      if(noGroup){
        var em=this.createItem(name,o.ind);
        em.firstChild.firstChild.setAttribute("hasIcon",true);
        em.firstChild.firstChild.setAttribute("src",this.main.getIconURL(o.id,o.user));
        em.setAttribute("newMsg",false);
        tree.appendChild(em);
      }else{
        var hostEm=document.getElementById(escape(groupId));
        if(!hostEm){
          hostEm=this.createItem(aliasGroup?groupId:this.main.getHostName(groupId),escape(groupId),true);
          if(!aliasGroup)hostEm.firstChild.firstChild.setAttribute("src",this.main.getIconURL(o.id,o.user));
          tree.appendChild(hostEm);
          hostEm=hostEm.lastChild;
        }
        var em=this.createItem(name,o.ind);
        if(aliasGroup){
          em.firstChild.firstChild.setAttribute("hasIcon",true);
          em.firstChild.firstChild.setAttribute("src",this.main.getIconURL(o.id,o.user));
        }
        em.setAttribute("newMsg",false);
        hostEm.appendChild(em);
      }
    }
    this.initTree();
  },
  initTree:function(ti){
    var treeView = document.getElementById("placesList").view;
    if(!treeView)return;
    if(ti){
      var i=treeView.getIndexOfItem(ti);
      /*if(i<0){
        var ind=treeView.getIndexOfItem(ti.parentNode.parentNode);
        if(ind>=0&&!treeView.isContainerOpen(ind)){
          treeView.toggleOpenState(ind);
        }
        i=treeView.getIndexOfItem(ti);
      }*/
      if(i>=0&&treeView.isContainerOpen(i)!=this.isOpen(ti.id)){
          treeView.toggleOpenState(i);
      }
      return;
    }
    for (var i = 0; i < treeView.rowCount; i++) {
      if (treeView.isContainer(i)){
        var ti2 = treeView.getItemAtIndex(i);
        if(treeView.isContainerOpen(i)!=this.isOpen(ti2.id)){
          treeView.toggleOpenState(i);
        }
      }
    }
  },
  createItem:function(label,id,isContainer,fid){
    var tc=document.createElement("treecell");
    tc.setAttribute("label",label);
    var tr=document.createElement("treerow");
    tr.appendChild(tc);
    var tc2=document.createElement("treecell");
    if(!isContainer){
      tc.setAttribute("properties","label logoff");
      tc.setAttribute("id","lb"+id);
      if(fid)tc.setAttribute("fid",fid);
      //tc.setAttribute("src","http://webmailnotifier.mozdev.org/favicon.ico");
      tc2.setAttribute("label","");
      tc2.setAttribute("properties","logoff");
      tc2.setAttribute("id",id);
      tc2.setAttribute("value",id);
    }
    tr.appendChild(tc2);
    var ti=document.createElement("treeitem");
    ti.appendChild(tr);
    if(isContainer){
      ti.setAttribute("container",true);
      ti.setAttribute("persist","open");
      ti.setAttribute("id","ti"+id);
      var tch=document.createElement("treechildren");
      tch.setAttribute("id",id);
      ti.appendChild(tch);
    }else{
      ti.setAttribute("id","cnt"+id);
      tc.setAttribute("value",id);
    }
    return ti;
  },
  isOpen:function(id){
    var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var ds=rdf.GetDataSource("rdf:local-store");
    var p = rdf.GetResource(document.location.href+"#"+id);
    var t = rdf.GetResource("open");
    var tar = ds.GetTarget(p, t, true);
    if(tar==null)return true;
    tar=tar.QueryInterface(Components.interfaces.nsIRDFLiteral);
    return tar.Value=="true";
  },
  onTreeClicked: function(event){
    // right-clicks are not handled here
    if (event.button == 2)
      return;
    var tree = document.getElementById("placesList");
    var tbo = tree.treeBoxObject;
    var row = { }, col = { }, child = { };
    tbo.getCellAt(event.clientX, event.clientY, row, col, child);
    if (row.value == -1 || child.value == "twisty")return;
    var val = tree.view.getCellValue(row.value, col.value);
    if(val){
      event.stopPropagation();
      if(val.indexOf("fd")==0){//folder
        var fnd=val.match(/fd(\d+)-/);
        if(fnd){
          if(col.value.id=="col0"){
            this.main.openView(fnd[1],document.getElementById("lb"+val).getAttribute("fid"));
          }else this.main.check(fnd[1]);
        }
      }else{
        if(col.value.id=="col0")this.main.openView(val,null);
        else this.main.check(val);
      }
    }
  },
  onStateChange: function(aIndex,aCount,aData){
    if(aIndex==this.main.MSG_INIT){
      this.init();
      return;
    }else if(aIndex==this.main.MSG_RESET){//accounts change
      this.init();
      com.tobwithu.tooltip.clearTooltip(document.getElementById("xnotifier-tooltip-text"));
      return;
    }else if(aIndex==this.main.MSG_CHECK_START){
      var ti=document.getElementById("lb"+aCount);
      if(ti)ti.setAttribute("src","chrome://xnotifier/skin/loading.png");
      return;
    }else if(aIndex<0){
      return;
    }
    var em=document.getElementById(aIndex);
    var obj=aData;
    /*if(obj.last){
      var l=new Date(parseInt(obj.last));
      l=l.getMinutes()+":"+l.getSeconds();
    }*/
    var o;
    for(var i in this.accounts){
      o=this.accounts[i];
      if(o.ind==aIndex){
        o.count=aCount;
        o.data=obj;
        break;
      }
    }
    com.tobwithu.tooltip.makeTooltip(this.main,document.getElementById("xnotifier-tooltip-text"),this.accounts);
    em.setAttribute("label",o.count==0&&!obj.desc?(obj.desc0?obj.desc0:"0"):obj.desc);
    var em2=document.getElementById("lb"+aIndex);
    var prop=aCount>0?"newMsg":(aCount==0?"noMsg":"logoff");
    em.setAttribute("properties",prop);
    em2.setAttribute("properties","label "+prop);
    if(em2.getAttribute("hasIcon")){
      em2.setAttribute("src",this.main.getIconURL(o.id,o.user));
    }else em2.removeAttribute("src");
    em.parentNode.setAttribute("properties",prop);//treerow
    var ti=document.getElementById("cnt"+aIndex);//container
    if(ti.childNodes.length>1){
      var tr=ti.firstChild;
      while(ti.firstChild) {
        ti.removeChild(ti.firstChild);
      }
      ti.appendChild(tr);
    }
    if(obj.folders&&obj.folders.length>0){
      ti.setAttribute("container",true);
      ti.setAttribute("persist","open");
      var tch=document.createElement("treechildren");
      ti.appendChild(tch);
      var ar=obj.folders;
      for(var i=0;i<ar.length;i++){
        var ind="fd"+aIndex+"-"+parseInt(i)
        var em=this.createItem(ar[i].title?ar[i].title:ar[i].id,ind,false,ar[i].id);
        //em.firstChild.setAttribute("properties","noSelect");
        tch.appendChild(em);
        var tc=document.getElementById(ind);
        tc.setAttribute("label",ar[i].count);
        //tc.setAttribute("properties","noSelect");
      }
      this.initTree(ti);
    }else{
      ti.removeAttribute("container");
    }
  },
  openViews: function(aEvent){
    if(aEvent && (aEvent.button==1||aEvent.button==2|| (aEvent.button==0&&aEvent.shiftKey))){
      this.main.openNewWindow();
      return;
    }
    var openAll=aEvent && (aEvent.button == 0&&(aEvent.altKey||aEvent.metaKey));
    this.main.openViews(openAll);
  }
}

function startup() {
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);
  var prefBranch = prefService.getBranch("");
  document.getElementById("col1").flex=prefBranch.getIntPref("extensions.xnotifier.dataColWidth");

  try {
    xnSb.main = Components.classes["@tobwithu.com/xnotifier;1"]
                                                .getService().wrappedJSObject;
    xnSb.main.addListener(xnSb);
  } catch (e){
dout(e);
  }
}

function shutdown() {
  xnSb.main.removeListener(xnSb);
}

window.addEventListener("load", startup, false);
window.addEventListener("unload", shutdown, false);
