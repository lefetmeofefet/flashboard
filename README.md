### Resources
- logo vector designed in https://editor.method.ac/
- 

### Keys and signing and google
There are 2 keys, upload and signing. upload is for uploading to app store, and signing is for users to verify with app store.
For google login, the signing key hash1 is important: we need to specify it in the console.
To generate upload key

To verify:
`"C:\Program Files\Java\jdk-23\bin\jarsigner.exe" -verify -verbose -certs C:\code\flutter_code\flashboard\build\app\outputs\bundle\release\app-release.aab`