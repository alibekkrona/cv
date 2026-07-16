/*
  Audi A8 D4 / 4H J285 DTC forensic reader

  Hardware:
  - Arduino Nano
  - MCP2515 CAN module with 8 MHz crystal
  - Library: "MCP_CAN_lib" by Cory J. Fowler

  Serial: 9600 baud

  Confirmed:
  - Cluster/J285 UDS request:  0x714
  - Cluster/J285 UDS response: 0x77E

  Purpose:
  - Read only. No DTC clearing, no coding, no adaptation, no flash, no security access.
  - Keep the bench context quiet: 6C0 + 2C3 + 3C0#FFFF0000.
  - Read the remaining DTCs after clear and ask J285 for extended data.

  UDS requests used:
  - 19 02 09: report DTC by status mask.
  - 19 06 <DTC> FF: report DTC extended data by DTC number, all records.
*/

#include <SPI.h>
#include <mcp_can.h>

static const byte CAN_CS_PIN = 10;
static const unsigned int UDS_REQ_ID = 0x714;
static const unsigned int UDS_RES_ID = 0x77E;

static const byte EXTENDED_RETRIES = 3;

MCP_CAN CAN(CAN_CS_PIN);

struct DtcEntry {
  byte a;
  byte b;
  byte c;
};

static const DtcEntry DTCS[] = {
  {0x90, 0x00, 0x01},
  {0x90, 0x3E, 0x12},
  {0x90, 0x58, 0x1B},
  {0xA0, 0x00, 0x44},
  {0xEA, 0x61, 0x00},
  {0xFF, 0xF0, 0x07},
  {0x10, 0x00, 0x04}
};

static unsigned long lastBaseMs = 0;
static unsigned long last3c0Ms = 0;
static unsigned long lastTesterMs = 0;
static unsigned long lastRequestMs = 0;
static unsigned long lastStatusMs = 0;
static unsigned long startedMs = 0;
static byte rolling = 0;
static byte requestStep = 0;
static unsigned long rxCount = 0;
static unsigned long txOk = 0;
static unsigned long txFail = 0;
static unsigned long posCount = 0;
static unsigned long negCount = 0;
static bool sentExtendedSession = false;
static bool completed = false;

static bool isotpActive = false;
static unsigned int isotpExpected = 0;
static unsigned int isotpLen = 0;
static byte isotpBuffer[128];

static byte readRegister(byte address) {
  digitalWrite(CAN_CS_PIN, LOW);
  SPI.transfer(0x03);
  SPI.transfer(address);
  byte value = SPI.transfer(0x00);
  digitalWrite(CAN_CS_PIN, HIGH);
  return value;
}

static void printHex2(byte value) {
  if (value < 0x10) {
    Serial.print('0');
  }
  Serial.print(value, HEX);
}

static void printHexBytes(unsigned int len, const byte *data) {
  for (unsigned int i = 0; i < len; i++) {
    printHex2(data[i]);
  }
}

static void printDtc(const DtcEntry &dtc) {
  printHex2(dtc.a);
  printHex2(dtc.b);
  printHex2(dtc.c);
}

static void printDtcFromPayload(const byte *data) {
  printHex2(data[0]);
  printHex2(data[1]);
  printHex2(data[2]);
}

static void printDtcList(unsigned int len, const byte *payload) {
  if (len < 3) {
    return;
  }

  Serial.print(F("DTC availability/status byte=0x"));
  printHex2(payload[2]);
  Serial.println();

  for (unsigned int pos = 3; pos + 3 < len; pos += 4) {
    Serial.print(F("  DTC "));
    printDtcFromPayload(payload + pos);
    Serial.print(F(" status=0x"));
    printHex2(payload[pos + 3]);
    Serial.println();
  }
}

static void sendFrame(unsigned long id, const byte *data, byte len) {
  byte result = CAN.sendMsgBuf(id, 0, len, (byte *)data);
  result == CAN_OK ? txOk++ : txFail++;
}

static void sendFlowControl() {
  byte fc[8] = {0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
  sendFrame(UDS_REQ_ID, fc, 8);
}

static const __FlashStringHelper *requestKindName(byte subFunction) {
  if (subFunction == 0x04) {
    return F("snapshot");
  }
  if (subFunction == 0x06) {
    return F("extended");
  }
  if (subFunction == 0x02) {
    return F("dtc-list");
  }
  return F("unknown");
}

static void printPayload(unsigned int len, const byte *payload) {
  if (len == 0) {
    return;
  }

  if (payload[0] == 0x59) {
    posCount++;
    Serial.print(F("POS 0x59 sub=0x"));
    if (len >= 2) {
      printHex2(payload[1]);
    } else {
      Serial.print(F("??"));
    }
    Serial.print(F(" kind="));
    if (len >= 2) {
      Serial.print(requestKindName(payload[1]));
    } else {
      Serial.print(F("unknown"));
    }
    Serial.print(F(" len="));
    Serial.print(len);
    Serial.print(F(" hex="));
    printHexBytes(len, payload);
    Serial.println();

    if (len >= 2 && payload[1] == 0x02) {
      printDtcList(len, payload);
    }
    return;
  }

  if (len >= 3 && payload[0] == 0x7F) {
    negCount++;
    Serial.print(F("NEG service=0x"));
    printHex2(payload[1]);
    Serial.print(F(" nrc=0x"));
    printHex2(payload[2]);
    Serial.println();
    return;
  }

  Serial.print(F("UDS payload len="));
  Serial.print(len);
  Serial.print(F(" hex="));
  printHexBytes(len, payload);
  Serial.println();
}

static void handleUdsResponse(byte len, const byte *data) {
  if (len == 0) {
    return;
  }

  const byte pci = data[0];
  const byte frameType = pci & 0xF0;

  if (frameType == 0x00) {
    byte payloadLen = pci & 0x0F;
    if (payloadLen > len - 1) {
      payloadLen = len - 1;
    }
    printPayload(payloadLen, data + 1);
    return;
  }

  if (frameType == 0x10) {
    isotpExpected = ((unsigned int)(pci & 0x0F) << 8) | data[1];
    isotpLen = 0;
    isotpActive = true;

    for (byte i = 2; i < len && isotpLen < sizeof(isotpBuffer); i++) {
      isotpBuffer[isotpLen++] = data[i];
    }

    sendFlowControl();
    return;
  }

  if (frameType == 0x20 && isotpActive) {
    for (byte i = 1; i < len && isotpLen < sizeof(isotpBuffer); i++) {
      isotpBuffer[isotpLen++] = data[i];
    }

    if (isotpLen >= isotpExpected) {
      printPayload(isotpExpected, isotpBuffer);
      isotpActive = false;
    }
  }
}

static void pollRx() {
  byte drained = 0;
  while (CAN.checkReceive() == CAN_MSGAVAIL && drained < 96) {
    unsigned long id = 0;
    byte len = 0;
    byte data[8] = {0};
    CAN.readMsgBuf(&id, &len, data);
    rxCount++;
    drained++;

    if (id == UDS_RES_ID) {
      handleUdsResponse(len, data);
    }
  }
}

static void sendBaseHold() {
  byte light6c0[8] = {0x01, 0x00, 0xFF, rolling, 0x00, 0x00, 0x00, 0x00};
  byte wake2c3[8] = {0x07, 0x00, 0x00, rolling, 0x00, 0x00, 0x00, 0x00};

  sendFrame(0x6C0, light6c0, 8);
  sendFrame(0x2C3, wake2c3, 8);
  rolling++;
}

static void sendStandby3c0() {
  byte data[4] = {0xFF, 0xFF, 0x00, 0x00};
  sendFrame(0x3C0, data, 4);
}

static void sendTesterPresent() {
  byte data[8] = {0x02, 0x3E, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
  sendFrame(UDS_REQ_ID, data, 8);
}

static void sendExtendedSession() {
  byte data[8] = {0x02, 0x10, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00};
  Serial.println(F("REQ extended session"));
  sendFrame(UDS_REQ_ID, data, 8);
}

static void configureUdsResponseFilters() {
  const unsigned long mask = 0x7FF0000UL;
  const unsigned long filter = ((unsigned long)UDS_RES_ID) << 16;

  CAN.init_Mask(0, 0, mask);
  CAN.init_Filt(0, 0, filter);
  CAN.init_Filt(1, 0, filter);

  CAN.init_Mask(1, 0, mask);
  CAN.init_Filt(2, 0, filter);
  CAN.init_Filt(3, 0, filter);
  CAN.init_Filt(4, 0, filter);
  CAN.init_Filt(5, 0, filter);

  Serial.println(F("RX filter: standard CAN ID 0x77E only"));
}

static void sendReadDtcList09() {
  byte data[8] = {0x03, 0x19, 0x02, 0x09, 0x00, 0x00, 0x00, 0x00};
  Serial.println(F("REQ 19 02 09 DTC list"));
  sendFrame(UDS_REQ_ID, data, 8);
}

static void sendDtcDetail(byte subFunction, const DtcEntry &dtc, byte recordNumber) {
  byte data[8] = {0x06, 0x19, subFunction, dtc.a, dtc.b, dtc.c, recordNumber, 0x00};

  Serial.print(F("REQ 19 "));
  printHex2(subFunction);
  Serial.print(F(" "));
  printDtc(dtc);
  Serial.print(F(" record "));
  printHex2(recordNumber);
  if (subFunction == 0x04) {
    Serial.print(F(" snapshotSweep"));
  }
  Serial.println();

  sendFrame(UDS_REQ_ID, data, 8);
}

static byte requestCount() {
  return 1 + (sizeof(DTCS) / sizeof(DTCS[0])) * EXTENDED_RETRIES;
}

static void sendNextRequest() {
  if (completed) {
    return;
  }

  if (requestStep == 0) {
    sendReadDtcList09();
    requestStep++;
    return;
  }

  const byte detailIndex = requestStep - 1;
  const byte dtcIndex = detailIndex / EXTENDED_RETRIES;
  const byte attempt = (detailIndex % EXTENDED_RETRIES) + 1;

  if (dtcIndex >= sizeof(DTCS) / sizeof(DTCS[0])) {
    completed = true;
    Serial.println(F("FORENSICS COMPLETE"));
    return;
  }

  Serial.print(F("ATTEMPT "));
  Serial.print(attempt);
  Serial.print(F("/"));
  Serial.println(EXTENDED_RETRIES);
  sendDtcDetail(0x06, DTCS[dtcIndex], 0xFF);
  requestStep++;
}

static void printStatus() {
  const byte eflg = readRegister(0x2D);
  const byte tec = readRegister(0x1C);
  const byte rec = readRegister(0x1D);

  Serial.print(F("STATUS dtcForensics step="));
  Serial.print(requestStep);
  Serial.print(F("/"));
  Serial.print(requestCount());
  Serial.print(F(" complete="));
  Serial.print(completed ? F("yes") : F("no"));
  Serial.print(F(" rx="));
  Serial.print(rxCount);
  Serial.print(F(" txOk="));
  Serial.print(txOk);
  Serial.print(F(" txFail="));
  Serial.print(txFail);
  Serial.print(F(" pos="));
  Serial.print(posCount);
  Serial.print(F(" neg="));
  Serial.print(negCount);
  Serial.print(F(" EFLG=0x"));
  printHex2(eflg);
  Serial.print(F(" TEC="));
  Serial.print(tec);
  Serial.print(F(" REC="));
  Serial.print(rec);
  Serial.println();
}

void setup() {
  pinMode(CAN_CS_PIN, OUTPUT);
  digitalWrite(CAN_CS_PIN, HIGH);

  Serial.begin(9600);
  delay(1000);

  Serial.println(F("BOOT 1 serial ok"));
  delay(100);
  Serial.println(F("A8 D4 J285 DTC forensic reader"));
  delay(100);
  Serial.println(F("BOOT 2 banner ok"));
  Serial.println(F("Confirmed UDS: 0x714 -> 0x77E"));
  Serial.println(F("BOOT 3 uds line ok"));
  Serial.println(F("Base: 6C0 + 2C3 + 3C0#FFFF0000"));
  Serial.println(F("BOOT 4 base line ok"));
  Serial.println(F("Read-only: 19 02 plus repeated 19 06 only"));
  Serial.println(F("BOOT 5 read-only line ok"));
  Serial.println(F("RX filter v5: MCP_STDEXT, repeated 19 06 only"));
  Serial.println(F("BOOT 6 filter line ok"));
  Serial.println(F("MCP2515 8MHz, CAN 500kbps, Serial 9600"));
  Serial.println(F("BOOT 7 before CAN.begin"));

  while (CAN.begin(MCP_STDEXT, CAN_500KBPS, MCP_8MHZ) != CAN_OK) {
    Serial.println(F("MCP init failed"));
    delay(1000);
  }

  Serial.println(F("BOOT 8 CAN.begin ok"));
  configureUdsResponseFilters();
  CAN.setMode(MCP_NORMAL);
  Serial.println(F("MCP init OK"));
  startedMs = millis();
}

void loop() {
  const unsigned long now = millis();

  pollRx();

  if (now - lastBaseMs >= 100) {
    lastBaseMs = now;
    sendBaseHold();
  }

  if (now - last3c0Ms >= 250) {
    last3c0Ms = now;
    sendStandby3c0();
  }

  if (now - lastTesterMs >= 2000) {
    lastTesterMs = now;
    sendTesterPresent();
  }

  if (!sentExtendedSession && now - startedMs >= 1000UL) {
    sentExtendedSession = true;
    sendExtendedSession();
  }

  if (sentExtendedSession && !completed && now - lastRequestMs >= 4000UL) {
    lastRequestMs = now;
    sendNextRequest();
  }

  if (now - lastStatusMs >= 5000UL) {
    lastStatusMs = now;
    printStatus();
  }
}
