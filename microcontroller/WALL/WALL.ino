#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Arduino_JSON.h>
#include <Preferences.h>
#include <FastLED.h>
#include <esp_bt_main.h>
#include <esp_bt_device.h>

#define NUM_LEDS 1000
#define DATA_PIN 19

Preferences preferences;
CRGB leds[NUM_LEDS];

BLEServer *pServer = NULL;
BLECharacteristic *pCharacteristic = NULL;

int appleIndex = -1;

// UUIDs for BLE service and characteristics
#define SERVICE_UUID        "5c8468d0-024e-4a0c-a2f1-4742299119e3"
#define CHARACTERISTIC_UUID "82155e2a-76a2-42fb-8273-ea01aa87c5be"

String getWallName() {
  preferences.begin("settings", true);  // Open in read-only mode
  String defaultName = "Flashboard";
  String value = preferences.getString("wallName", defaultName);
  preferences.end();
  return value;
}

void setWallName(String name) {
    preferences.begin("settings", false);  // Open in read-write mode
    preferences.putString("wallName", name);
    preferences.end();
    esp_ble_gap_set_device_name(name.c_str());
    BLEDevice::startAdvertising();
}

int getBrightness() {
  preferences.begin("settings", true);  // Open in read-only mode
  int value = preferences.getInt("brightness", 120);  // Brightness level (0 - 255)
  preferences.end();
  return value;
}

void setBrightness(int brightness) {
  preferences.begin("settings", false);  // Open in read-write mode
  Serial.println("Brightness: " + brightness);
  preferences.putInt("brightness", brightness);
  preferences.end();
  FastLED.setBrightness(brightness);
}

void sendMessage(String message) {
  pCharacteristic->setValue(message);
  pCharacteristic->notify();
  Serial.println("Sent message: " + message);
}

class MessageCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String messageString = pCharacteristic->getValue();
    Serial.println("Got message: " + messageString);

    // Send the message back to all other connected clients
    sendMessage(messageString);
    JSONVar message = JSON.parse(messageString);
    String command = message["command"];

    if (command == "getInfo") {
      JSONVar response;
      response["brightness"] = getBrightness();
      response["wallName"] = getWallName();
      String macAddress = getBluetoothMACAddress();
      response["id"] = macAdress;
      response["macAddress"] = macAddress;
      response["ledBoxId"] = macAddress;
      response["command"] = "wallInfo";
      sendMessage(JSON.stringify(response));
    } else if (command == "setWallName") {
      setWallName(message["wallName"]);
    } else if (command == "setBrightness") {
      setBrightness(message["brightness"]);
    } else if (command == "setLeds") {
      appleIndex = -1;  // Stop snake game
      JSONVar ledsList = message["leds"];

      // Turn off all leds
      for (int i=0; i<NUM_LEDS; i++) {
        leds[i] = CRGB(0, 0, 0);
      }
      // Turn on route leds
      for (int i=0; i<ledsList.length(); i++) {
        JSONVar ledGroup = ledsList[i];
        int r = ledGroup["r"];
        int g = ledGroup["g"];
        int b = ledGroup["b"];
        for (int j=0; j<ledGroup["i"].length(); j++) {
          int index = ledGroup["i"][j];
          leds[index] = CRGB(r, g, b);
        }
      }
      FastLED.show();
    } else if (command == "setLed") {
      JSONVar led = message["led"];
      if (message["snakeMode"]) {
        if (appleIndex == -1) {
          createApple();
        }
        
        CRGB existingLed = leds[led["i"]];
        if (appleIndex == (int)led["i"]) {
          JSONVar response;
          response["color"] = led;
          response["command"] = "playerAteApple";
          sendMessage(JSON.stringify(response));
          createApple();
        } else if (((int)led["r"] != 0 || (int)led["g"] != 0 || (int)led["b"] != 0) && (existingLed.r != 0 || existingLed.g != 0 || existingLed.b != 0)) {
          // if new led tries to override existing led, kill the player
          // Serial.println("Killing " + (int)led["r"] + " " + (int)led["g"] + " " + (int)led["b"]);
          JSONVar response;
          response["color"] = led;
          response["command"] = "killPlayer";
          sendMessage(JSON.stringify(response));
          return;
        }
      } else {
        appleIndex = -1;  // Stop snake game 
      }
      leds[led["i"]] = CRGB(led["r"], led["g"], led["b"]);
      FastLED.show();
    } else if (command == "clearLeds") {
      clearLeds();
    }
  }
};

void createApple() {
  while (true) {
    appleIndex = random(0, NUM_LEDS);
    if (leds[appleIndex].r == 0 && leds[appleIndex].g == 0 && leds[appleIndex].b == 0) {
      leds[appleIndex] = CRGB(255, 0, 0);
      FastLED.show();
      break;
    }
  }
}

int devicesConnected = 0;
class ConnectionCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      devicesConnected += 1;
      delay(100); // NEW TESTING
      BLEDevice::startAdvertising();
      Serial.println("+++ device connected, started advertising");
    }

    void onDisconnect(BLEServer* pServer) {
      devicesConnected -= 1;
      delay(100); // NEW TESTING
      BLEDevice::startAdvertising();
      Serial.println("--- device disconnected, started advertising");
    }
};

void setupBluetooth() {
    String wallName = getWallName();
    BLEDevice::init(wallName);
    BLEDevice::setMTU(256); // Increase max transmission unit (request size) // NEW TESTING

    // Max bluetooth power! // NEW TESTING
    esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_DEFAULT, ESP_PWR_LVL_P9);
    esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_ADV, ESP_PWR_LVL_P9);
    esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_SCAN ,ESP_PWR_LVL_P9);

    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ConnectionCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ |
      BLECharacteristic::PROPERTY_WRITE |
      BLECharacteristic::PROPERTY_NOTIFY
    );

    pCharacteristic->addDescriptor(new BLE2902());
    pCharacteristic->setCallbacks(new MessageCallbacks());
    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);

    // Connection interval - lower is less lag but higher power usage
    pAdvertising->setMinPreferred(0x06);  // should help with iOS issue (??) // NEW TESTING
    pAdvertising->setMinPreferred(0x12); // NEW TESTING

    // Advertising interval - same as above
    //pAdvertising->setMinInterval(0x18); // 30ms
    //pAdvertising->setMaxInterval(0x30); // 60ms
    //pAdvertising->setMinInterval(0x100); // 160ms
    //pAdvertising->setMaxInterval(0x200); // 320ms

    BLEDevice::startAdvertising();
}

void setupLeds() {
  FastLED.addLeds<WS2811, DATA_PIN, RGB>(leds, NUM_LEDS);
  setBrightness(getBrightness());

  // Shut down leds on startup
  clearLeds();
}

void setup() {
  Serial.begin(115200);
  setupBluetooth();
  setupLeds();
}


int secondsWithoutConnection = 0;
const int CLEAR_LEDS_TIMEOUT_SECONDS = 3600;
void loop() {
    delay(1000);

    // Clear the leds if no device is connected for some time
    if (devicesConnected == 0) {
      secondsWithoutConnection += 1;
      if (secondsWithoutConnection == CLEAR_LEDS_TIMEOUT_SECONDS) {
        clearLeds();
      }
    } else {
      secondsWithoutConnection = 0;
    }
}

void clearLeds() {
  for (int i=0; i<NUM_LEDS; i++) {
    leds[i] = CRGB(0, 0, 0);
  }
  FastLED.show();
}


String getBluetoothMACAddress() {
  const uint8_t* btMacAddress = esp_bt_dev_get_address();
  String macStr = "";

  for (int i = 0; i < 6; i++) {
    // Convert each byte to a two-digit hexadecimal string
    if (btMacAddress[i] < 0x10) macStr += "0";  // Add leading zero if necessary
    macStr += String(btMacAddress[i], HEX);

    if (i < 5) macStr += ":";  // Add colon separator between bytes
  }

  macStr.toUpperCase();  // Convert to uppercase for readability
  return macStr;
}
