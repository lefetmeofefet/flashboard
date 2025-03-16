### Resources
- logo vector designed in https://editor.method.ac/
- 

## Android: Keys and signing and google
I followed this tutorial on releasing a flutter app on android: https://docs.flutter.dev/deployment/android

There are 2 keys, upload and signing. upload is generated by us and it's for uploading to app store, and signing is generated by google, and is for users to verify with app store.

For google login, the signing key hash1 found in play console -> test and release -> setup -> app signing is important: we need to specify it in the google developer console hash1 field.

To generate upload key:
`"C:\Program Files\Java\jdk-23\bin\keytool.exe" -genkey -v -keystore C:\code\flutter_code\keystore\upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload`

To verify the key:
`"C:\Program Files\Java\jdk-23\bin\jarsigner.exe" -verify -verbose -certs C:\code\flutter_code\flashboard\build\app\outputs\bundle\release\app-release.aab`
