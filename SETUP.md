## Install on an Android Phone from Windows with USB

This installs the app as a normal Android app. No Expo Go.

### 1. Phone setup

On the phone:

1. Enable Developer options: `Settings > About phone > Build number`, tap 7 times.
2. Enable `USB debugging` in Developer options.
3. Plug the phone into the PC.
4. Accept the USB debugging popup on the phone.

Check the phone is connected:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

It should show `device`.

### 2. Build the APK

From the project folder:

```powershell
npm install
npx expo prebuild --platform android
cd android
.\gradlew.bat assembleDebug
cd ..
```

APK location:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

### 3. Install it on the phone

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r .\android\app\build\outputs\apk\debug\app-debug.apk
```

Then open `Flight Logger` on the phone.

### Useful Commands

Check connected phones:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

Restart ADB if the phone is not detected:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" kill-server
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" start-server
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

Reinstall/update the app:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r .\android\app\build\outputs\apk\debug\app-debug.apk
```

Launch the app:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.przemekwasinski.flightlogger 1
```

Clear app data:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell pm clear com.przemekwasinski.flightlogger
```

Uninstall the app:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.przemekwasinski.flightlogger
```

View live logs:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" logcat
```

View only app-related logs:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" logcat | findstr /i "flightlogger reactnative expo"
```

Take a screenshot from the phone:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" exec-out screencap -p > screenshot.png
```

Check installed app info:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell dumpsys package com.przemekwasinski.flightlogger
```

Open Android app settings:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell am start -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:com.przemekwasinski.flightlogger
```

### Quick Fixes

- `adb` shows `unauthorized`: unlock the phone and accept the USB debugging popup.
- `adb` shows nothing: try another cable or set USB mode to `File transfer`.
- `gradlew.bat` is missing: run `npx expo prebuild --platform android`.
- Install fails because of signing: use `assembleDebug`, not `assembleRelease`.

## Optional Expo Preview

```powershell
npx expo start --tunnel
```
