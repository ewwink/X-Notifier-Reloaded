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
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Scott MacGregor <mscott@netscape.com>
 *   Jens Bannmann <jens.b@web.de>
 *   Byungwook Kang <tobwithu@gmail.com>
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

// Copied from nsILookAndFeel.h, see comments on eMetric_AlertNotificationOrigin
const NS_ALERT_HORIZONTAL = 1;
const NS_ALERT_LEFT = 2;
const NS_ALERT_TOP = 4;

var gOrigin = 0; // Default value: alert from bottom right.

var gAlertListener = null;
var gAlertTextClickable = false;
var gAlertCookie = "";

var autoClose=true;
var main=null;
var timer;
var timerFunc;
const dout=Components.utils.reportError;
function setTimer(func,time){
  var o={
    notify:function(aTimer){
      func();
    }
  };
  timer.initWithCallback(o,time,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
}
function prefillAlertInfo()
{
  main=window.arguments[0].wrappedJSObject[1];
  var obj=document.getElementById("alertTextBox");
  var info=window.arguments[0].wrappedJSObject[0];
  var close=true;
  var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService();
  prefService = prefService.QueryInterface(Components.interfaces.nsIPrefService);
  var prefBranch = prefService.getBranch(null);
  var style=prefBranch.getCharPref("extensions.xnotifier.alertTextStyle");
  for(var i=0;i<info.length;i++){
    var o=info[i];
    var n;
    if(o.enabled==2&&(n=o.calcCount())>0){
      var em = document.createElement("label");
      em.ind=o.ind;
      var pre=o.data.prevCount;
      em.setAttribute("value",o.accName+" : "+o.data.desc+(pre!=-1&&o.count>pre?" (+"+(o.count-pre)+")":""));
      em.setAttribute("class","alertText plain"+(pre!=-1&&o.count>pre?" boldText":""));
      em.addEventListener("click",function(){main.openView(this.ind,null);},false);
      em.setAttribute('clickable', true);
      if(style)em.setAttribute("style",style);
      obj.appendChild(em);
      close=false;
    }
  }
  if(close)window.close();
}
function onAlertLoad()
{
  var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService();
  prefService = prefService.QueryInterface(Components.interfaces.nsIPrefService);
  var prefBranch = prefService.getBranch(null);
  gOrigin=prefBranch.getIntPref("extensions.xnotifier.alertOrigin");
  if(!prefBranch.getBoolPref("extensions.xnotifier.autoHideNotification"))autoClose=false;
  timer = Components.classes["@mozilla.org/timer;1"]
              .createInstance(Components.interfaces.nsITimer);

  ////////////////ff 16 or earlier///////////////////////
  var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                          .getService(Components.interfaces.nsIXULAppInfo);
  var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                 .getService(Components.interfaces.nsIVersionComparator);
  if(versionChecker.compare(appInfo.platformVersion, "17.0")<0){
    try{
      gSlideIncrement = prefBranch.getIntPref("alerts.slideIncrement");
      gSlideTime = prefBranch.getIntPref("alerts.slideIncrementTime");
      gOpenTime = prefBranch.getIntPref("alerts.totalOpenTime");
    }catch (ex){}
    document.getElementById("alertImageBox").setAttribute("align","top");
    onAlertLoad_old();
    return;
  }
  //////////////////////////////////////////////////////

  var ALERT_DURATION_IMMEDIATE = prefBranch.getIntPref("extensions.xnotifier.notificationDelay");
  var alertTextBox = document.getElementById("alertTextBox");
  var alertImageBox = document.getElementById("alertImageBox");
  alertImageBox.style.minHeight = alertTextBox.scrollHeight + "px";

  sizeToContent();

  // Determine position
  var x = gOrigin & NS_ALERT_LEFT ? screen.availLeft :
          screen.availLeft + screen.availWidth - window.outerWidth;
  var y = gOrigin & NS_ALERT_TOP ? screen.availTop :
          screen.availTop + screen.availHeight - window.outerHeight;

  // Offset the alert by 10 pixels from the edge of the screen
  y += gOrigin & NS_ALERT_TOP ? 10 : -10;
  x += gOrigin & NS_ALERT_LEFT ? 10 : -10;

  window.moveTo(x, y);
  if(!autoClose)return;
  // Bug 1352069 merged alerts.disableSlidingEffect into toolkit.cosmeticAnimations.enabled
  var disableAnimation;
  try {
    disableAnimation = !prefBranch.getBoolPref("toolkit.cosmeticAnimations.enabled");
  } catch(err) {
    try {
      disableAnimation = prefBranch.getBoolPref("alerts.disableSlidingEffect");
    } catch(err) {
      disableAnimation = false;
    }
  }
  if (disableAnimation) {
    setTimeout(closeAlert, ALERT_DURATION_IMMEDIATE);
    return;
  }
  var alertBox = document.getElementById("alertBox");
  alertBox.addEventListener("animationend", function hideAlert(event) {
    if (event.animationName == "alert-animation") {
      alertBox.removeEventListener("animationend", hideAlert, false);
      closeAlert();
    }
  }, false);
  alertBox.setAttribute("animate", true);
}

function closeAlert() {
    if (gAlertListener)
      gAlertListener.observe(null, "alertfinished", gAlertCookie);
    window.close();
}

var gFinalSize;
var gCurrentSize = 1;

var gSlideIncrement = 1;
var gSlideTime = 10;
var gOpenTime = 4000; // total time the alert should stay up once we are done animating.
function onAlertLoad_old()
{
  // Make sure that the contents are fixed at the window edge facing the
  // screen's center so that the window looks like "sliding in" and not
  // like "unfolding". The default packing of "start" only works for
  // vertical-bottom and horizontal-right positions, so we change it here.
  if (gOrigin & NS_ALERT_HORIZONTAL)
  {
    if (gOrigin & NS_ALERT_LEFT)
      document.documentElement.pack = "end";

    // Additionally, change the orientation so the packing works as intended
    document.documentElement.orient = "horizontal";
  }
  else
  {
    if (gOrigin & NS_ALERT_TOP)
      document.documentElement.pack = "end";
  }

  var alertBox = document.getElementById("alertBox");
//  alertBox.orient = (gOrigin & NS_ALERT_HORIZONTAL) ? "vertical" : "horizontal";

  // The above doesn't cause the labels in alertTextBox to reflow,
  // see bug 311557. As the theme's -moz-box-align css rule gets ignored,
  // we work around the bug by setting the align property.
  if (gOrigin & NS_ALERT_HORIZONTAL)
  {
//    document.getElementById("alertTextBox").align = "center";
  }

  sizeToContent();

  // Work around a bug where sizeToContent() leaves a border outside of the content
  var contentDim = document.getElementById("alertBox").boxObject;
  if (window.innerWidth == contentDim.width + 1)
    --window.innerWidth;

  // Start with a 1px width/height, because 0 causes trouble with gtk1/2
  gCurrentSize = 1;

  // Determine final size
  if (gOrigin & NS_ALERT_HORIZONTAL)
  {
    gFinalSize = window.outerWidth;
    window.outerWidth = gCurrentSize;
  }
  else
  {
    gFinalSize = window.outerHeight;
    window.outerHeight = gCurrentSize;
  }

  // Determine position
  var x = gOrigin & NS_ALERT_LEFT ? screen.availLeft :
          screen.availLeft + screen.availWidth - window.outerWidth;
  var y = gOrigin & NS_ALERT_TOP ? screen.availTop :
          screen.availTop + screen.availHeight - window.outerHeight;

  // Offset the alert by 10 pixels from the edge of the screen
  if (gOrigin & NS_ALERT_HORIZONTAL)
    y += gOrigin & NS_ALERT_TOP ? 10 : -10;
  else
    x += gOrigin & NS_ALERT_LEFT ? 10 : -10;
  window.moveTo(x, y);
  setTimer(animateAlert, gSlideTime);
}

function animate(step)
{
  gCurrentSize += step;

  if (gOrigin & NS_ALERT_HORIZONTAL)
  {
    if (!(gOrigin & NS_ALERT_LEFT))
      window.screenX -= step;
    window.outerWidth = gCurrentSize;
  }
  else
  {
    if (!(gOrigin & NS_ALERT_TOP))
      window.screenY -= step;
    window.outerHeight = gCurrentSize;
  }
}

function animateAlert()
{
  if (gCurrentSize < gFinalSize)
  {
    animate(gSlideIncrement);
    setTimer(animateAlert, gSlideTime);
  }
  else if(autoClose)
    setTimer(animateCloseAlert, gOpenTime);
}

function animateCloseAlert()
{
  if (gCurrentSize > 1)
  {
    animate(-gSlideIncrement);
    setTimer(animateCloseAlert, gSlideTime);
  }
  else
    closeAlert();
}
