# X-Notifier-Reloaded 3.5.26
Notifies your webmails, improvement and fix for X-notifier 3.5.23 because original author has been abandoned this version. 

## Requirement
- Firefox 13 - 56
- Firefox Nightly 57 with `extensions.legacy.enabled = true` and `extensions.allow-non-mpc-extensions = true`.

## Release History
- 3.5.26: 
  - Fix Yahoo Count
  
- 3.5.25 - August 14 2017: 
  - Fix Yahoo Login, thanks to @jeroen1956
  - Compatibility with Firefox 57, thanks to @Loirooriol

- 3.5.24: 
  - fixed Gmail bugs: `isLoggedIn -> basic HTML`
  
## Download and Install
Available at release page: https://github.com/ewwink/X-Notifier-Reloaded/releases

## Signing The Extension
- clone or download this repo
- install 7z
- create batch script called `create-xpi.bat` like following

```
"C:\Program Files\7-Zip\7z.exe" a -tzip -mx=9 -mm=Deflate -mfb=258 -mmt=8 "X-Notifier-Reloaded-3.5.25.xpi" chrome/* components/* defaults/* chrome.manifest install.rdf
pause
```

- upload and sign your `.xpi` to [Mozilla Developer Hub](https://addons.mozilla.org/en-US/developers/addon/submit/agreement)

## Get Involved
Pull Request and sugestion are welcome. Mainly I will only fix Gmail and Yahoo, if you have other problem please go to X-notifier [Forum directly](http://xnotifier.tobwithu.com/dp/forum/1).

## Credit
Thanks a lot [tobwithu](http://xnotifier.tobwithu.com)

