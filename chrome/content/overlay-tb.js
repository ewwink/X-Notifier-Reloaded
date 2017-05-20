com.tobwithu.xnotifier.showToolbarButton=function(){
  try {
     var toolbar = document.getElementById("mail-bar3");
     var curSet = toolbar.currentSet;
     if (curSet.indexOf("xnotifier-toolbar-button") == -1)
     {
       var set;
       // Place the button before the urlbar
       if (curSet.indexOf("gloda-search") != -1)
         set = curSet.replace(/gloda-search/, "xnotifier-toolbar-button,gloda-search");
       else  // at the end
         set = curSet + ",xnotifier-toolbar-button";
       toolbar.setAttribute("currentset", set);
       toolbar.currentSet = set;
       document.persist("mail-bar3", "currentset");
       // If you don't do the following call, funny things happen
       try {
         BrowserToolboxCustomizeDone(true);
       }
       catch (e) { }
     }
   }
   catch(e) { }
}