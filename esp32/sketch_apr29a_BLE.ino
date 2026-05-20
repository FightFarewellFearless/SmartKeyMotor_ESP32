#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <esp_gap_ble_api.h>
#include <Preferences.h>
#include "mbedtls/md.h"
#include "RTClib.h"

#include <optional>

#define SERVICE_UUID "7d8eccd3-aaea-40ae-a1c7-6a2f8ac051b6"
#define ENGINE_SEND_CHARACTERISTIC_UUID "6fcf5039-b8ff-4485-8cea-eedf7da298ef"
#define CHALLENGE_CHARACTERISTIC_UUID "36ccb7b1-382f-4f88-a1fa-ae6e10f84032"
#define TIMEBYPASS_CHARACTERISTIC_UUID "cb9483dd-5216-4c36-9a88-9bda52865574"

uint32_t passkey = 308081;

const int RELAY_PIN = 27;

std::optional<String> currentChallenge;
std::optional<String> engineToken;

// RTC
RTC_DS3231 rtc;
bool isRTCConnected = false;
Preferences preferences;

String generateRandomString(int length) {
  String charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  String result = "";
  for (int i = 0; i < length; i++) {
    int index = esp_random() % charset.length();
    result += charset[index];
  }
  return result;
}
String calculateSHA256(String input) {
  mbedtls_md_context_t ctx;
  mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;
  byte shaResult[32];

  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 0);
  mbedtls_md_starts(&ctx);
  mbedtls_md_update(&ctx, (const unsigned char *)input.c_str(), input.length());
  mbedtls_md_finish(&ctx, shaResult);
  mbedtls_md_free(&ctx);

  String hashStr = "";
  for (int i = 0; i < 32; i++) {
    char buf[3];
    sprintf(buf, "%02x", shaResult[i]);
    hashStr += buf;
  }
  return hashStr;
}

class MySecurity : public BLESecurityCallbacks {
  uint32_t onPassKeyRequest() {
    return passkey;  // This is your static PIN
  }
  void onPassKeyNotify(uint32_t pass_key) {}
  bool onConfirmPIN(uint32_t pass_key) {
    return true;
  }
  bool onSecurityRequest() {
    return true;
  }

  void onAuthenticationComplete(esp_ble_auth_cmpl_t auth_cmpl) {}
};

// class MyServerCallbacks : public BLEServerCallbacks {
//   void onConnect(BLEServer *pServer) {
//     pServer->requestConnParams(uint8_t *remote_bda, uint16_t minInterval, uint16_t maxInterval, uint16_t latency, uint16_t timeout)
//   };

//   void onDisconnect(BLEServer *pServer) {
//     BLEDevice::startAdvertising();
//   }
// };

BLECharacteristic *pEngineCharacteristic = nullptr;

bool isEngineOn() {
  return digitalRead(RELAY_PIN) == LOW;
}
void setEngineIsOn(bool isItOn) {
  if (isEngineOn() != isItOn) {
    digitalWrite(RELAY_PIN, isItOn ? LOW : HIGH);

    if (pEngineCharacteristic != nullptr) {
      pEngineCharacteristic->setValue(isItOn ? "true" : "false");
      pEngineCharacteristic->notify();
    }
  }
}


class EngineCharacteristicsCallbacks : public BLECharacteristicCallbacks {
  void onRead(BLECharacteristic *pEngineCharacteristic) {
    pEngineCharacteristic->setValue(isEngineOn() ? "true" : "false");
  }
  void onWrite(BLECharacteristic *pEngineCharacteristic) {
    String rxValue = pEngineCharacteristic->getValue();
    if (rxValue.length() > 0) {
      if (engineToken && rxValue == "on" + engineToken.value()) {
        setEngineIsOn(true);
        engineToken = std::nullopt;
      } else if (engineToken && rxValue == "off" + engineToken.value()) {
        setEngineIsOn(false);
        engineToken = std::nullopt;
      };
    }
  }
};

class ChallengeCharacteristicsCallbacks : public BLECharacteristicCallbacks {
  void onRead(BLECharacteristic *pChallengeCharacteristic) {
    if (engineToken) {
      pChallengeCharacteristic->setValue("token|" + engineToken.value());
    } else {
      String randomString = generateRandomString(16);
      currentChallenge = randomString;
      pChallengeCharacteristic->setValue("challenge|" + randomString);
    }
  }
  void onWrite(BLECharacteristic *pChallengeCharacteristic) {
    String value = pChallengeCharacteristic->getValue().c_str();
    if (value.length() > 0) {
      String challenge;
      String nonce;
      int splitIndex = value.indexOf('|');

      if (splitIndex != -1) {
        challenge = value.substring(0, splitIndex);
        nonce = value.substring(splitIndex + 1);
      }
      if (currentChallenge && challenge == currentChallenge.value()) {
        String resultHash = calculateSHA256(challenge + nonce);
        if (resultHash.startsWith("000")) {
          engineToken = generateRandomString(8);
          pChallengeCharacteristic->setValue((String("token|") + engineToken.value()).c_str());
        }
      } else {
        // Challenge not exist
      }
    }
  }
};

class TimeBypassCharacteristicsCallbacks : public BLECharacteristicCallbacks {
  void onRead(BLECharacteristic *pTimeBypassChr) {
    if (isRTCConnected) {
      preferences.begin("timebypass", true);
      pTimeBypassChr->setValue(preferences.getString("timebypass", String(rtc.now().unixtime())));
      preferences.end();
    } else {
      pTimeBypassChr->setValue("0");
    }
  }
  void onWrite(BLECharacteristic *pTimeBypassChr) {
    String rxvalue = pTimeBypassChr->getValue().c_str();
    if (rxvalue.length() > 0) {
      int splitIndex = rxvalue.indexOf('|');
      if (splitIndex != -1) {
        String type = rxvalue.substring(0, splitIndex);
        String value = rxvalue.substring(splitIndex + 1);
        if (engineToken && type == "sync" + engineToken.value()) {
          uint32_t newTimestamp = strtoul(value.c_str(), NULL, 10);
          rtc.adjust(DateTime(newTimestamp));
          engineToken = std::nullopt;
        } else if (engineToken && type == "setbypasstime" + engineToken.value()) {
          preferences.begin("timebypass", false);
          preferences.putString("timebypass", value);
          preferences.end();
          if (strtoul(value.c_str(), NULL, 10) > rtc.now().unixtime()) {
            setEngineIsOn(true);
          } else {
            setEngineIsOn(false);
          }
          engineToken = std::nullopt;
        }
      }
    }
  }
};


void setup() {
  if (!rtc.begin()) {
    isRTCConnected = false;
  } else {
    isRTCConnected = true;
  }
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);

  BLEDevice::init("K_MTR");
  BLEDevice::setMTU(120);

  BLEDevice::setSecurityCallbacks(new MySecurity());

  BLEServer *pServer = BLEDevice::createServer();
  // pServer->setCallbacks(new MyServerCallbacks());
  pServer->advertiseOnDisconnect(true);
  BLEService *pService = pServer->createService(SERVICE_UUID);

  pEngineCharacteristic = pService->createCharacteristic(
    ENGINE_SEND_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);

  pEngineCharacteristic->setAccessPermissions(ESP_GATT_PERM_READ_ENCRYPTED | ESP_GATT_PERM_WRITE_ENCRYPTED);
  pEngineCharacteristic->addDescriptor(new BLE2902());
  pEngineCharacteristic->setCallbacks(new EngineCharacteristicsCallbacks());
  pEngineCharacteristic->setValue("Engine state");

  BLECharacteristic *pChallengeCharacteristic = pService->createCharacteristic(
    CHALLENGE_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE);

  pChallengeCharacteristic->setAccessPermissions(ESP_GATT_PERM_READ_ENCRYPTED | ESP_GATT_PERM_WRITE_ENCRYPTED);
  pChallengeCharacteristic->setCallbacks(new ChallengeCharacteristicsCallbacks());
  pChallengeCharacteristic->setValue("Challenge");

  BLECharacteristic *pTimeBypassChr = pService->createCharacteristic(
    TIMEBYPASS_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE);
  pTimeBypassChr->setAccessPermissions(ESP_GATT_PERM_READ_ENCRYPTED | ESP_GATT_PERM_WRITE_ENCRYPTED);
  pTimeBypassChr->setCallbacks(new TimeBypassCharacteristicsCallbacks());
  pTimeBypassChr->setValue("TimeBypass");


  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);

  pAdvertising->setMinInterval(0x20); 
  pAdvertising->setMaxInterval(0x40);

  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // Bantu koneksi iPhone
  pAdvertising->setMaxPreferred(0x12);
  
  pAdvertising->start();

  BLESecurity *pSecurity = new BLESecurity();
  pSecurity->setAuthenticationMode(ESP_LE_AUTH_REQ_SC_MITM_BOND);
  pSecurity->setCapability(ESP_IO_CAP_OUT);
  pSecurity->setInitEncryptionKey(ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);

  esp_ble_gap_set_security_param(ESP_BLE_SM_SET_STATIC_PASSKEY, &passkey, sizeof(uint32_t));

  preferences.begin("timebypass", true);
  if (isRTCConnected) {
    uint32_t savedTime = strtoul(preferences.getString("timebypass", "0").c_str(), NULL, 10);
    if (savedTime > rtc.now().unixtime()) {
      setEngineIsOn(true);
    }
  }
  preferences.end();
}

void loop() {
  static unsigned long lastCheck = 0;

  if (millis() - lastCheck > 3000) {
    lastCheck = millis();

    if (isRTCConnected) {
      preferences.begin("timebypass", true);
      uint32_t savedTime = strtoul(preferences.getString("timebypass", "0").c_str(), NULL, 10);
      preferences.end();

      uint32_t currentTime = rtc.now().unixtime();

      if (savedTime > 0 && currentTime >= savedTime) {
        preferences.begin("timebypass", false);
        preferences.putString("timebypass", "0");
        preferences.end();
        // setEngineIsOn(false); // Auto-Off feature
      }
    }
  }
}