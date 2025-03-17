
## Running the server
1. Configure environment variables
   1. create a `.env` file and copy the contents of `example.env` into it
   2. edit the variables to fit your env 
2. Run the server: `npm run backend`
3. Follow the url in the console print

## Contributing
You're welcome to send me feature ideas, report bugs, and even make contributions! Join me on the [discord server](https://discord.gg/x5gbeD6hcA).

Disclaimer: the app is for free but it might add some premium non-essential paid features in the future like AI route generation, etc. So even though it's an open source project, it's partly for-profit.

### Resources
- web ui library: https://yoffee.org
- neo4j hosting at Neo4J Aura https://console-preview.neo4j.io/
- logo vector designed in https://editor.method.ac/
- favicon from https://realfavicongenerator.net

## BT protocol
The app connects to a BLE server with the following service and characteristic:
- service: 5c8468d0-024e-4a0c-a2f1-4742299119e3
- characteristic: 82155e2a-76a2-42fb-8273-ea01aa87c5be

If you're using this app with your own BLE server controller, please use a different service/characteristic, so that in case my controller get to you _somehow_, they won't clash :)

The messages are simple JSONs, with the field "command" dictating the message type and the rest of the fields. You can see the exact messages in your serial terminal on the arduino/esp32, or in the file bluetooth.js  

## Android play store: Keys and signing and google
I followed this tutorial on releasing a flutter app on android: https://docs.flutter.dev/deployment/android

There are 2 keys, upload and signing. upload is generated by us and it's for uploading to play store, and signing is generated by google, and is for users to verify with app store.

For google login, the signing key hash1 found in play console -> test and release -> setup -> app signing is important: we need to specify it in the google developer console hash1 field.

To generate upload key:
`"C:\Program Files\Java\jdk-23\bin\keytool.exe" -genkey -v -keystore C:\code\flutter_code\keystore\upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload`

To verify the key:
`"C:\Program Files\Java\jdk-23\bin\jarsigner.exe" -verify -verbose -certs C:\code\flutter_code\flashboard\build\app\outputs\bundle\release\app-release.aab`
