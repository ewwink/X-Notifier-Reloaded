//@line 36 "/cygdrive/c/builds/tinderbox/Tb-Mozilla1.8.0-Release/WINNT_5.2_Depend/mozilla/mail/components/preferences/notifications.js"

var gNotificationsDialog = {
  mSound: null,

  init: function()
  {
  },

  convertURLToLocalFile: function(aFileURL)
  {
    if (aFileURL)
    {
      var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      var fph = ios.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
      return fph.getFileFromURLSpec(aFileURL);
    }
    else
      return null;
  },

  readSoundLocation: function()
  {
    var soundUrlLocation = document.getElementById('soundUrlLocation');
    soundUrlLocation.value = document.getElementById("pref-soundUrl").value;
    var f=this.convertURLToLocalFile(soundUrlLocation.value)
    if(f!=null){
      soundUrlLocation.label = f.leafName;    
      soundUrlLocation.image = "moz-icon://" + soundUrlLocation.label + "?size=16";
    }
    return undefined;
  },

  previewSound: function ()
  {
    if (!this.mSound)
      this.mSound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);

    var soundLocation;
    soundLocation = document.getElementById("newMailNotificationType").value == "true"?
                    document.getElementById("soundUrlLocation").value : "_moz_mailbeep"

    if (soundLocation.indexOf("file://") == -1){
      var os = Components.classes["@mozilla.org/xre/app-info;1"]
                  .getService(Components.interfaces.nsIXULRuntime).OS;
      if(os=="Darwin")this.mSound.beep();
      else this.mSound.playSystemSound(soundLocation);
    }else{
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      this.mSound.play(ioService.newURI(soundLocation, null, null));
    }
  },

  browseForSoundFile: function ()
  {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    // if we already have a sound file, then use the path for that sound file
    // as the initial path in the dialog.
    var localFile = this.convertURLToLocalFile(document.getElementById("soundUrlLocation").value);
    if (localFile)
      fp.displayDirectory = localFile;

    // XXX todo, persist the last sound directory and pass it in
    // XXX todo filter by .wav
    fp.init(window, document.getElementById("bundlePreferences").getString("soundFilePickerTitle"), nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterAll);

    var ret = fp.show();
    if (ret == nsIFilePicker.returnOK)
    {
      var mailnewsSoundFileUrl = document.getElementById("soundUrlLocation");

      document.getElementById("pref-soundUrl").value = fp.fileURL.spec;
      this.readSoundLocation(); // XXX We shouldn't have to be doing this by hand
    }
  },
};

