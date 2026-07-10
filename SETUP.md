## Transferring the app from a Windows Machine to an Android Phone:

1) .\gradlew.bat assembleRelease

2) & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install .\app\build\outputs\apk\release\app-release.apk

## Test with Expo:

npx expo start --tunnel