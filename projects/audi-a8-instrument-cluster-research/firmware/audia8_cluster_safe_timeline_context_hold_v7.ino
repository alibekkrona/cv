/*
  Audi A8 D4 / 4H J285 SAFE timeline context hold v7

  Focus:
  - Single long hold around the best v4 visual context.
  - Add a clean 2C3 zero-to-run edge at the beginning.
  - Add one optional 0x403/0x400 ordinary network-context pulse.
  - Reduce background traffic and attempt MCP2515 recovery after TXBO flag.
  - Delay all UDS traffic until T+60s, then take one diagnostic snapshot.

  This sketch is read-only on UDS. It does not clear DTCs, does not use
  SecurityAccess, does not code, does not adapt, does not flash, and does not
  attempt CP removal.
*/

#include <SPI.h>
#include <mcp_can.h>

static const byte CAN_CS_PIN = 10;
static const unsigned int UDS_REQ_ID = 0x714;
static const unsigned int UDS_RES_ID = 0x77E;

static const unsigned long HOLD_DURATION_MS = 180000UL;
static const unsigned long EDGE_DURATION_MS = 700UL;
static const unsigned long THREE_C0_PERIOD_MS = 100UL;
static const unsigned long TWO_C3_PERIOD_MS = 200UL;
static const unsigned long VEH300_PERIOD_MS = 500UL;
static const unsigned long TIME_PERIOD_MS = 1000UL;
static const unsigned long CAN_HEALTH_PERIOD_MS = 1000UL;
static const unsigned long UDS_START_MS = 60000UL;
static const unsigned long TESTER_PERIOD_MS = 4000UL;
static const unsigned long STATUS_PERIOD_MS = 5000UL;

MCP_CAN CAN(CAN_CS_PIN);

static const byte RUN_3C0[4] = {0x00, 0x00, 0xFF, 0xFF};
static const byte BASE_2C3[8] = {0x02, 0xA1, 0x00, 0x00, 0, 0, 0, 0};

static unsigned long startedMs = 0;
static unsigned long last3c0Ms = 0;
static unsigned long last2c3Ms = 0;
static unsigned long last300Ms = 0;
static unsigned long last621Ms = 0;
static unsigned long last627Ms = 0;
static unsigned long lastTesterMs = 0;
static unsigned long lastStatusMs = 0;
static unsigned long lastCanHealthMs = 0;
static unsigned long rxCount = 0;
static unsigned long txOk = 0;
static unsigned long txFail = 0;
static unsigned long posCount = 0;
static unsigned long negCount = 0;
static unsigned long canRecoveries = 0;
static byte snapshotStep = 0;
static byte rolling2c3 = 0;
static byte rolling300 = 0;
static byte timeSecond = 0x00;
static bool sentExtendedSession = false;
static bool sentNmPulse = false;
static bool printedRunPhase = false;
static bool complete = false;

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

static void printHexBytes(byte len, const byte *data) {
  for (byte i = 0; i < len; i++) {
    printHex2(data[i]);
  }
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

  Serial.print(F("DTC_AVAIL=0x"));
  printHex2(payload[2]);
  Serial.println();

  for (unsigned int pos = 3; pos + 3 < len; pos += 4) {
    Serial.print(F("DTC "));
    printDtcFromPayload(payload + pos);
    Serial.print(F("/"));
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

static const __FlashStringHelper *kindName(byte subFunction) {
  if (subFunction == 0x02) {
    return F("dtc-list");
  }
  if (subFunction == 0x06) {
    return F("extended");
  }
  return F("other");
}

static void printPayload(unsigned int len, const byte *payload) {
  if (len == 0) {
    return;
  }

  Serial.print(F("T+"));
  Serial.print(millis() - startedMs);
  Serial.print(F(" "));

  if (payload[0] == 0x59) {
    posCount++;
    Serial.print(F("POS 59 sub=0x"));
    if (len >= 2) {
      printHex2(payload[1]);
    } else {
      Serial.print(F("??"));
    }
    Serial.print(F(" kind="));
    if (len >= 2) {
      Serial.print(kindName(payload[1]));
    } else {
      Serial.print(F("unknown"));
    }
    Serial.print(F(" len="));
    Serial.print(len);
    Serial.print(F(" hex="));
    printHexBytes((byte)len, payload);
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

  Serial.print(F("UDS len="));
  Serial.print(len);
  Serial.print(F(" hex="));
  printHexBytes((byte)len, payload);
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
  while (CAN.checkReceive() == CAN_MSGAVAIL && drained < 64) {
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

static void sendTesterPresent() {
  byte data[8] = {0x02, 0x3E, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00};
  sendFrame(UDS_REQ_ID, data, 8);
}

static void sendExtendedSession() {
  byte data[8] = {0x02, 0x10, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00};
  Serial.println(F("REQ extended session"));
  sendFrame(UDS_REQ_ID, data, 8);
}

static void sendReadDtcList09() {
  byte data[8] = {0x03, 0x19, 0x02, 0x09, 0x00, 0x00, 0x00, 0x00};
  Serial.println(F("REQ 19 02 09 DTC list"));
  sendFrame(UDS_REQ_ID, data, 8);
}

static void sendReadEa6100() {
  byte data[8] = {0x06, 0x19, 0x06, 0xEA, 0x61, 0x00, 0xFF, 0x00};
  Serial.println(F("REQ 19 06 EA6100 FF"));
  sendFrame(UDS_REQ_ID, data, 8);
}

static void sendRead903e12() {
  byte data[8] = {0x06, 0x19, 0x06, 0x90, 0x3E, 0x12, 0xFF, 0x00};
  Serial.println(F("REQ 19 06 903E12 FF"));
  sendFrame(UDS_REQ_ID, data, 8);
}

static void sendNmPulse() {
  byte nm[8] = {0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
  Serial.println(F("NM_PULSE 403#0100000000000000 400#0100000000000000"));
  sendFrame(0x403, nm, 8);
  delay(5);
  sendFrame(0x400, nm, 8);
}

static void send2c3Zero() {
  byte data[8] = {0};
  sendFrame(0x2C3, data, 8);
}

static void send2c3Run() {
  byte data[8];
  for (byte i = 0; i < 8; i++) {
    data[i] = BASE_2C3[i];
  }
  data[3] = rolling2c3 & 0x0F;
  rolling2c3++;
  sendFrame(0x2C3, data, 8);
}

static void send300() {
  byte data[8] = {0x01, 0x2D, 0x00, rolling300, 0x00, 0x00, 0x00, 0x00};
  rolling300++;
  sendFrame(0x300, data, 8);
}

static void send621() {
  byte data[8] = {0x20, 0x26, 0x07, 0x01, 0x11, 0x16, timeSecond, 0x00};
  sendFrame(0x621, data, 8);
}

static void send627() {
  byte data[8] = {0x20, 0x26, 0x07, 0x01, 0x11, 0x16, timeSecond, 0x00};
  sendFrame(0x627, data, 8);
  timeSecond++;
  if (timeSecond >= 0x60) {
    timeSecond = 0x00;
  }
}

static void printStatus() {
  const byte eflg = readRegister(0x2D);
  const byte tec = readRegister(0x1C);
  const byte rec = readRegister(0x1D);

  Serial.print(F("STATUS V7_HOLD t="));
  Serial.print(millis() - startedMs);
  Serial.print(F(" phase="));
  Serial.print((millis() - startedMs) < EDGE_DURATION_MS ? F("2C3_ZERO_EDGE") : F("RUN_HOLD"));
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
  Serial.print(F(" snap="));
  Serial.print(snapshotStep);
  Serial.print(F(" recov="));
  Serial.print(canRecoveries);
  Serial.print(F(" EFLG=0x"));
  printHex2(eflg);
  Serial.print(F(" TEC="));
  Serial.print(tec);
  Serial.print(F(" REC="));
  Serial.print(rec);
  Serial.println();
}

static void serviceCanHealth(unsigned long now) {
  if (now - lastCanHealthMs < CAN_HEALTH_PERIOD_MS) {
    return;
  }
  lastCanHealthMs = now;

  const byte eflg = readRegister(0x2D);
  if (eflg & 0x20) {
    canRecoveries++;
    Serial.print(F("CAN_RECOVERY txbo-like EFLG=0x"));
    printHex2(eflg);
    Serial.println(F(" -> MCP_NORMAL"));
    CAN.setMode(MCP_NORMAL);
  }
}

static void sendCurrentContext(unsigned long now) {
  const unsigned long elapsed = now - startedMs;

  if (!sentNmPulse && elapsed >= 50UL) {
    sentNmPulse = true;
    sendNmPulse();
  }

  if (now - last3c0Ms >= THREE_C0_PERIOD_MS) {
    last3c0Ms = now;
    sendFrame(0x3C0, RUN_3C0, 4);
  }

  if (now - last2c3Ms >= TWO_C3_PERIOD_MS) {
    last2c3Ms = now;
    if (elapsed < EDGE_DURATION_MS) {
      send2c3Zero();
    } else {
      if (!printedRunPhase) {
        printedRunPhase = true;
        Serial.println(F("PHASE RUN_HOLD 2C3#02A100<roll>00000000 300#012D00<roll>00000000 621+627"));
      }
      send2c3Run();
    }
  }

  if (elapsed >= EDGE_DURATION_MS && now - last300Ms >= VEH300_PERIOD_MS) {
    last300Ms = now;
    send300();
  }

  if (elapsed >= EDGE_DURATION_MS && now - last621Ms >= TIME_PERIOD_MS) {
    last621Ms = now;
    send621();
  }

  if (elapsed >= EDGE_DURATION_MS && now - last627Ms >= TIME_PERIOD_MS) {
    last627Ms = now;
    send627();
  }
}

void setup() {
  pinMode(CAN_CS_PIN, OUTPUT);
  digitalWrite(CAN_CS_PIN, HIGH);

  Serial.begin(9600);
  delay(1000);

  Serial.println(F("A8 D4 J285 SAFE timeline context hold v7"));
  Serial.println(F("Build: 2026-07-01 safe-hold-v7"));
  Serial.println(F("Read-only UDS: 19 02 09, 19 06 EA6100, 19 06 903E12"));
  Serial.println(F("Context: v6 visual hold, no UDS before T+60s, one snapshot"));
  Serial.println(F("MCP2515 8MHz, CAN 500kbps, Serial 9600"));

  while (CAN.begin(MCP_STDEXT, CAN_500KBPS, MCP_8MHZ) != CAN_OK) {
    Serial.println(F("MCP init failed"));
    delay(1000);
  }

  configureUdsResponseFilters();
  CAN.setMode(MCP_NORMAL);
  Serial.println(F("MCP init OK"));

  startedMs = millis();
  Serial.println(F("TEST_BEGIN V7_HOLD"));
  Serial.println(F("PHASE 2C3_ZERO_EDGE first 700ms"));
  Serial.println(F("VISUAL_NOTE: manually note display_on / air_suspension_screen / SAFE / off time"));
}

void loop() {
  const unsigned long now = millis();

  pollRx();

  if (complete) {
    return;
  }

  serviceCanHealth(now);
  sendCurrentContext(now);

  const unsigned long elapsed = now - startedMs;

  if (!sentExtendedSession && elapsed >= UDS_START_MS) {
    sentExtendedSession = true;
    Serial.println(F("UDS_SNAPSHOT_BEGIN delayed T+60s"));
    sendExtendedSession();
  }

  if (sentExtendedSession && now - lastTesterMs >= TESTER_PERIOD_MS) {
    lastTesterMs = now;
    sendTesterPresent();
  }

  if (sentExtendedSession) {
    if (snapshotStep == 0 && elapsed >= UDS_START_MS + 2500UL) {
      snapshotStep = 1;
      sendReadDtcList09();
    } else if (snapshotStep == 1 && elapsed >= UDS_START_MS + 5000UL) {
      snapshotStep = 2;
      sendReadEa6100();
    } else if (snapshotStep == 2 && elapsed >= UDS_START_MS + 7500UL) {
      snapshotStep = 3;
      sendRead903e12();
    } else if (snapshotStep == 3 && elapsed >= UDS_START_MS + 10000UL) {
      snapshotStep = 4;
      Serial.println(F("UDS_SNAPSHOT_DONE"));
    }
  }

  if (now - lastStatusMs >= STATUS_PERIOD_MS) {
    lastStatusMs = now;
    printStatus();
  }

  if (now - startedMs >= HOLD_DURATION_MS) {
    complete = true;
    Serial.println(F("V7 HOLD COMPLETE"));
    printStatus();
  }
}
