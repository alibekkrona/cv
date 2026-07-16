/*
  Audi A8 D4 / 4H J285 bench system emulator probe

  Hardware:
  - Arduino Nano
  - MCP2515 CAN module with 8 MHz crystal
  - Library: "MCP_CAN_lib" by Cory J. Fowler

  Serial: 9600 baud

  Confirmed on local 4H0920840F bench:
  - 0x3C0 DLC4 00 00 FF FF = run / active attempt.
  - 0x3C0 DLC4 FF FF 00 00 = standby / engine off.

  Purpose:
  - Keep the proven 0x3C0 terminal state under manual control.
  - Add/remove reversible context layers to approximate the A8 environment.
  - Read J285 DTCs so we can see which missing/implausible messages remain.

  This sketch does not disable CP/immobilizer/SAFE. It only sends normal
  bench CAN context frames and read-only diagnostic requests.
*/

#include <SPI.h>
#include <mcp_can.h>

static const byte CAN_CS_PIN = 10;
static const unsigned int UDS_REQ_ID = 0x714;
static const unsigned int UDS_RES_ID = 0x77E;
static const unsigned long RUN_PULSE_MS = 8000UL;
static const unsigned long RUN_CONTEXT_DELAY_MS = 750UL;
static const unsigned long DEMO_REFRESH_MS = 8000UL;
static const unsigned long DEMO_STANDBY_MS = 150UL;
static const byte RX_PROBE_MAX_IDS = 32;
static const byte STATE_WATCH_COUNT = 8;
static const char BUILD_TAG[] = "2026-06-07 gwdoc-3";

MCP_CAN CAN(CAN_CS_PIN);

enum Mode {
  MODE_STANDBY,
  MODE_RUN,
  MODE_RUN_PULSE,
  MODE_STOP
};

enum Profile {
  PROFILE_3C0_ONLY,
  PROFILE_3C0_2C3,
  PROFILE_3C0_2C3_6C0,
  PROFILE_FULL_CONTEXT
};

enum GatewayCandidate {
  GW_NONE,
  GW_5F3,
  GW_6F3,
  GW_BOTH
};

enum VehicleCandidate {
  VEH_NONE,
  VEH_KOMBI_REPEAT,
  VEH_STATUS_LOW,
  VEH_DRIVETRAIN,
  VEH_ALL
};

enum TxGroup {
  TX_3C0,
  TX_CONTEXT,
  TX_NM,
  TX_GATEWAY,
  TX_UDS,
  TX_GROUP_COUNT
};

static Mode mode = MODE_STOP;
static Profile profile = PROFILE_3C0_ONLY;
static GatewayCandidate gatewayCandidate = GW_NONE;
static VehicleCandidate vehicleCandidate = VEH_NONE;

static bool testerPresentEnabled = false;
static bool slowTx = true;
static bool dtcBurstActive = false;
static bool dtcExtBurstActive = false;
static bool dtcSnapBurstActive = false;
static bool autoTestActive = false;
static bool profileScanActive = false;
static bool envScanActive = false;
static bool candScanActive = false;
static bool cpScanActive = false;
static bool rxProbeActive = false;
static bool rxProbeCollecting = false;
static bool stateProbeActive = false;
static bool stateProbeCollecting = false;
static bool holdTestActive = false;
static bool holdTestMonitoring = false;
static bool holdTestRunWatch = false;
static bool holdTestSafeSeen = false;
static bool demoModeActive = false;
static bool demoStandbyPulse = false;
static bool gaugeTestActive = false;
static bool dossierActive = false;
static bool didSweepActive = false;
static bool diagEmuActive = false;
static bool diagEmuSafeSeen = false;
static bool gwDocActive = false;
static bool gwDocRunActive = false;
static bool gwDocSafeSeen = false;
static bool suppressPeriodicStatus = false;
static byte dtcBurstStep = 0;
static byte dtcDetailStep = 0;
static byte autoTestStep = 0;
static byte profileScanStep = 0;
static byte envScanStep = 0;
static byte candScanStep = 0;
static byte cpScanStep = 0;
static byte rxProbeStep = 0;
static byte stateProbeStep = 0;
static byte holdTestStep = 0;
static byte holdTestCandidate = 0;
static byte holdTestFirstCandidate = 0;
static byte holdTestLastCandidate = 6;
static byte holdCandIndex = 255;
static byte holdCpIndex = 255;
static byte holdStandbyCleanCount = 0;
static byte gaugeTestStep = 0;
static byte gaugeTestPhase = 0;
static byte dossierStep = 0;
static byte didSweepIndex = 0;
static byte diagEmuStep = 0;
static byte diagEmuVariant = 0;
static byte gwDocStep = 0;
static byte threeC0IntervalIndex = 2;

static unsigned long runStartedMs = 0;
static unsigned long last3c0Ms = 0;
static unsigned long lastContextMs = 0;
static unsigned long lastNmMs = 0;
static unsigned long lastGatewayCandidateMs = 0;
static unsigned long lastVehicleCandidateMs = 0;
static unsigned long lastCandScanMs = 0;
static unsigned long lastAirbagMs = 0;
static unsigned long lastTimeMs = 0;
static unsigned long lastTesterMs = 0;
static unsigned long lastDtcBurstMs = 0;
static unsigned long lastDtcDetailMs = 0;
static unsigned long lastStatusMs = 0;
static unsigned long quietTesterUntilMs = 0;
static unsigned long autoTestNextMs = 0;
static unsigned long profileScanNextMs = 0;
static unsigned long envScanNextMs = 0;
static unsigned long candScanNextMs = 0;
static unsigned long cpScanNextMs = 0;
static unsigned long rxProbeNextMs = 0;
static unsigned long stateProbeNextMs = 0;
static unsigned long holdTestNextMs = 0;
static unsigned long holdTestRunMs = 0;
static unsigned long holdTestSafeAtMs = 0;
static unsigned long holdTestStandbyMs = 0;
static unsigned long demoLastRefreshMs = 0;
static unsigned long demoStandbyStartedMs = 0;
static unsigned long gaugeTestNextMs = 0;
static unsigned long gaugeTestRunMs = 0;
static unsigned long lastGaugeTxMs = 0;
static unsigned long lastDossierMs = 0;
static unsigned long lastDidSweepMs = 0;
static unsigned long diagEmuRunMs = 0;
static unsigned long lastDiagEmuMs = 0;
static unsigned long lastDiagEmuTesterMs = 0;
static unsigned long lastDiagEmuDtcMs = 0;
static unsigned long gwDocNextMs = 0;
static unsigned long gwDocRunMs = 0;
static unsigned long lastGwDocMs = 0;
static unsigned long gwDocSafeAtMs = 0;
static unsigned long gwDocLast5e4Ms = 0;
static unsigned long gwDocLast5f3Ms = 0;
static unsigned long lastHoldCandMs = 0;
static unsigned long lastHoldCpMs = 0;
static unsigned long lastStateProbePrintMs = 0;
static unsigned long stateProbePrintIntervalMs = 1000UL;
static unsigned long lastCpScanMs = 0;

static byte rolling = 0;
static byte nmCounter = 0;
static unsigned long rxCount = 0;
static unsigned long txOk = 0;
static unsigned long txFail = 0;
static unsigned long testerOkCount = 0;
static unsigned long rx3c0Count = 0;
static unsigned long rx5f3Count = 0;
static unsigned long rx6f3Count = 0;
static unsigned long rx000Count = 0;
static unsigned long txGroupOk[TX_GROUP_COUNT] = {0};
static unsigned long txGroupFail[TX_GROUP_COUNT] = {0};

static unsigned long rxProbeIds[RX_PROBE_MAX_IDS] = {0};
static unsigned int rxProbeCounts[RX_PROBE_MAX_IDS] = {0};
static byte rxProbeLens[RX_PROBE_MAX_IDS] = {0};
static byte rxProbeData[RX_PROBE_MAX_IDS][8] = {{0}};
static byte rxProbeUsed = 0;
static unsigned long rxProbeDropped = 0;

static const unsigned long stateWatchIds[STATE_WATCH_COUNT] = {
  0x30B, 0x6C7, 0x9BFC38BA, 0x9BFC38B7,
  0x9BFC38B6, 0x9BFC38B5, 0x9BFC38B3, 0x9BFC38B2
};
static unsigned int stateWatchCounts[STATE_WATCH_COUNT] = {0};
static byte stateWatchLens[STATE_WATCH_COUNT] = {0};
static byte stateWatchData[STATE_WATCH_COUNT][8] = {{0}};

static byte holdLast30BLen = 0;
static byte holdLast30B[8] = {0};
static byte diagLast30BLen = 0;
static byte diagLast30B[8] = {0};
static byte gwDocLast30BLen = 0;
static byte gwDocLast30B[8] = {0};
static byte gwDocLastCpCounter = 0;
static byte gwDocLastNmByte6 = 0;
static byte gwDocLastNmCounter = 0;
static bool gwDocDtcRequested = false;

static void clearHoldExtras();

static bool isotpActive = false;
static unsigned int isotpExpected = 0;
static unsigned int isotpLen = 0;
static byte isotpBuffer[112];

static byte readRegister(byte address) {
  digitalWrite(CAN_CS_PIN, LOW);
  SPI.transfer(0x03);
  SPI.transfer(address);
  byte value = SPI.transfer(0x00);
  digitalWrite(CAN_CS_PIN, HIGH);
  return value;
}

static void bitModify(byte address, byte mask, byte data) {
  digitalWrite(CAN_CS_PIN, LOW);
  SPI.transfer(0x05);
  SPI.transfer(address);
  SPI.transfer(mask);
  SPI.transfer(data);
  digitalWrite(CAN_CS_PIN, HIGH);
}

static void clearMcpFlags() {
  bitModify(0x2C, 0xFF, 0x00); // CANINTF
  bitModify(0x2D, 0xC0, 0x00); // EFLG RX0OVR/RX1OVR are sticky overflow flags
}

static void abortPendingTx() {
  bitModify(0x0F, 0x10, 0x10); // CANCTRL.ABAT
  delay(2);
  bitModify(0x0F, 0x10, 0x00);
}

static void resetLocalStats() {
  rxCount = 0;
  txOk = 0;
  txFail = 0;
  testerOkCount = 0;
  rx3c0Count = 0;
  rx5f3Count = 0;
  rx6f3Count = 0;
  rx000Count = 0;
  for (byte i = 0; i < TX_GROUP_COUNT; i++) {
    txGroupOk[i] = 0;
    txGroupFail[i] = 0;
  }
}

static void resetRxProbeStats() {
  rxProbeUsed = 0;
  rxProbeDropped = 0;
  for (byte i = 0; i < RX_PROBE_MAX_IDS; i++) {
    rxProbeIds[i] = 0;
    rxProbeCounts[i] = 0;
    rxProbeLens[i] = 0;
    for (byte j = 0; j < 8; j++) {
      rxProbeData[i][j] = 0;
    }
  }
}

static void resetStateWatchStats() {
  for (byte i = 0; i < STATE_WATCH_COUNT; i++) {
    stateWatchCounts[i] = 0;
    stateWatchLens[i] = 0;
    for (byte j = 0; j < 8; j++) {
      stateWatchData[i][j] = 0;
    }
  }
}

static void reinitCanController() {
  CAN.setMode(MCP_SLEEP);
  delay(10);
  while (CAN.begin(MCP_STDEXT, CAN_500KBPS, MCP_8MHZ) != CAN_OK) {
    Serial.println(F("MCP reinit failed"));
    delay(500);
  }
  CAN.setMode(MCP_NORMAL);
  resetLocalStats();
  clearMcpFlags();
  Serial.println(F("MCP reinit OK"));
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

static const __FlashStringHelper *modeName() {
  switch (mode) {
    case MODE_RUN:
      return F("run");
    case MODE_RUN_PULSE:
      return F("run-pulse");
    case MODE_STOP:
      return F("stop");
    default:
      return F("standby");
  }
}

static const __FlashStringHelper *profileName() {
  switch (profile) {
    case PROFILE_3C0_2C3:
      return F("3c0+2c3");
    case PROFILE_3C0_2C3_6C0:
      return F("3c0+2c3+6c0");
    case PROFILE_FULL_CONTEXT:
      return F("full");
    default:
      return F("3c0-only");
  }
}

static const __FlashStringHelper *gatewayCandidateName() {
  switch (gatewayCandidate) {
    case GW_5F3:
      return F("5f3");
    case GW_6F3:
      return F("6f3");
    case GW_BOTH:
      return F("5f3+6f3");
    default:
      return F("none");
  }
}

static const __FlashStringHelper *vehicleCandidateName() {
  switch (vehicleCandidate) {
    case VEH_KOMBI_REPEAT:
      return F("30b+5f2");
    case VEH_STATUS_LOW:
      return F("5f5+5f7+65e");
    case VEH_DRIVETRAIN:
      return F("630+62d+62f");
    case VEH_ALL:
      return F("all");
    default:
      return F("none");
  }
}

static bool isRunMode() {
  return mode == MODE_RUN || mode == MODE_RUN_PULSE;
}

static bool runContextReady() {
  return isRunMode() && millis() - runStartedMs >= RUN_CONTEXT_DELAY_MS;
}

static unsigned long intervalMs(unsigned long normalMs, unsigned long slowMs) {
  return slowTx ? slowMs : normalMs;
}

static unsigned long threeC0IntervalMs() {
  switch (threeC0IntervalIndex) {
    case 0:
      return 100;
    case 1:
      return 250;
    case 3:
      return 1000;
    case 4:
      return 2000;
    default:
      return 500;
  }
}

static void sendFrame(unsigned long id, const byte *data, byte len, TxGroup group) {
  byte result = CAN.sendMsgBuf(id, 0, len, (byte *)data);
  if (result == CAN_OK) {
    txOk++;
    txGroupOk[group]++;
  } else {
    txFail++;
    txGroupFail[group]++;
    abortPendingTx();
  }
}

static void sendFlowControl() {
  byte fc[8] = {0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
  sendFrame(UDS_REQ_ID, fc, 8, TX_UDS);
}

static void printDtcRecords(unsigned int len, const byte *payload) {
  if (len < 3 || payload[0] != 0x59 || payload[1] != 0x02) {
    return;
  }

  Serial.print(F(" DTC_RECORDS"));
  byte offset = 3;
  while (offset + 3 < len) {
    unsigned long dtc = ((unsigned long)payload[offset] << 16) |
                        ((unsigned long)payload[offset + 1] << 8) |
                        payload[offset + 2];
    byte status = payload[offset + 3];

    Serial.print(F(" "));
    if (dtc < 0x100000UL) {
      Serial.print('0');
    }
    Serial.print(dtc, HEX);
    Serial.print('/');
    printHex2(status);

    if (dtc == 0xEA6100UL) {
      Serial.print(F("(CP_ACTIVE)"));
    }

    offset += 4;
  }
}

static void printUdsPayload(unsigned int len, const byte *payload) {
  if (len == 2 && payload[0] == 0x7E && payload[1] == 0x00) {
    testerOkCount++;
    return;
  }

  Serial.print(F("UDS len="));
  Serial.print(len);
  Serial.print(F(" hex="));
  printHexBytes(len, payload);

  if (len >= 3 && payload[0] == 0x7F) {
    Serial.print(F(" NEG service=0x"));
    printHex2(payload[1]);
    Serial.print(F(" nrc=0x"));
    printHex2(payload[2]);
  } else if (len >= 1 && payload[0] == 0x59) {
    Serial.print(F(" DTC_POS"));
    printDtcRecords(len, payload);
  } else if (len >= 1 && payload[0] == 0x50) {
    Serial.print(F(" SESSION_OK"));
  } else if (len >= 1 && payload[0] == 0x7E) {
    Serial.print(F(" TESTER_OK"));
  }

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
    printUdsPayload(payloadLen, data + 1);
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
      printUdsPayload(isotpExpected, isotpBuffer);
      isotpActive = false;
    }
  }
}

static void recordRxProbeFrame(unsigned long id, byte len, const byte *data) {
  if (!rxProbeCollecting) {
    return;
  }

  byte slot = RX_PROBE_MAX_IDS;
  for (byte i = 0; i < rxProbeUsed; i++) {
    if (rxProbeIds[i] == id) {
      slot = i;
      break;
    }
  }

  if (slot == RX_PROBE_MAX_IDS) {
    if (rxProbeUsed >= RX_PROBE_MAX_IDS) {
      rxProbeDropped++;
      return;
    }
    slot = rxProbeUsed++;
    rxProbeIds[slot] = id;
  }

  if (rxProbeCounts[slot] < 65535) {
    rxProbeCounts[slot]++;
  }
  rxProbeLens[slot] = len;
  for (byte i = 0; i < 8; i++) {
    rxProbeData[slot][i] = i < len ? data[i] : 0;
  }
}

static void recordStateProbeFrame(unsigned long id, byte len, const byte *data) {
  if (!stateProbeCollecting) {
    return;
  }

  for (byte slot = 0; slot < STATE_WATCH_COUNT; slot++) {
    if (stateWatchIds[slot] != id) {
      continue;
    }

    if (stateWatchCounts[slot] < 65535) {
      stateWatchCounts[slot]++;
    }
    stateWatchLens[slot] = len;
    for (byte i = 0; i < 8; i++) {
      stateWatchData[slot][i] = i < len ? data[i] : 0;
    }
    return;
  }
}

static void recordHoldTestFrame(unsigned long id, byte len, const byte *data) {
  if (!holdTestMonitoring || id != 0x30B) {
    return;
  }

  holdLast30BLen = len;
  for (byte i = 0; i < 8; i++) {
    holdLast30B[i] = i < len ? data[i] : 0;
  }

  if (!holdTestRunWatch && len >= 8) {
    if (data[0] == 0x00 && data[2] == 0x01 && data[7] == 0x80) {
      if (holdStandbyCleanCount < 255) {
        holdStandbyCleanCount++;
      }
    } else if (data[0] == 0x00 && data[2] == 0x01 && data[7] == 0x98) {
      holdStandbyCleanCount = 0;
    }
  }

  if (holdTestRunWatch && !holdTestSafeSeen && len >= 8 &&
      data[0] == 0x6F && data[2] == 0x11 && data[7] == 0x98) {
    holdTestSafeSeen = true;
    holdTestSafeAtMs = millis() - holdTestRunMs;
    Serial.print(F("HOLD MARK safe30b candidate="));
    Serial.print(holdTestCandidate);
    Serial.print(F(" atMs="));
    Serial.print(holdTestSafeAtMs);
    Serial.print(F(" last30B="));
    printHexBytes(holdLast30BLen, holdLast30B);
    Serial.println();
  }
}

static void recordDiagEmuFrame(unsigned long id, byte len, const byte *data) {
  if (!diagEmuActive || id != 0x30B) {
    return;
  }

  diagLast30BLen = len;
  for (byte i = 0; i < 8; i++) {
    diagLast30B[i] = i < len ? data[i] : 0;
  }

  if (!diagEmuSafeSeen && len >= 8 &&
      data[0] == 0x6F && data[2] == 0x11 && data[7] == 0x98) {
    diagEmuSafeSeen = true;
    Serial.print(F("DIAGEMU MARK safe30b atMs="));
    Serial.print(millis() - diagEmuRunMs);
    Serial.print(F(" last30B="));
    printHexBytes(diagLast30BLen, diagLast30B);
    Serial.println();
  }
}

static void recordGwDocFrame(unsigned long id, byte len, const byte *data) {
  if (!gwDocActive || id != 0x30B) {
    return;
  }

  gwDocLast30BLen = len;
  for (byte i = 0; i < len && i < 8; i++) {
    gwDocLast30B[i] = data[i];
  }

  if (!gwDocSafeSeen && len >= 8 &&
      data[0] == 0x6F && data[2] == 0x11 && data[7] == 0x98) {
    gwDocSafeSeen = true;
    gwDocSafeAtMs = millis() - gwDocRunMs;
    Serial.print(F("GWDOC MARK safe30b atMs="));
    Serial.print(gwDocSafeAtMs);
    Serial.print(F(" last30B="));
    printHexBytes(gwDocLast30BLen, gwDocLast30B);
    Serial.print(F(" cpB7=0x"));
    printHex2(gwDocLastCpCounter);
    Serial.print(F(" nmB6=0x"));
    printHex2(gwDocLastNmByte6);
    Serial.print(F(" nmCounter="));
    Serial.print(gwDocLastNmCounter);
    printCanHealthCompact();
    Serial.println();
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

    if (id == 0x3C0) {
      rx3c0Count++;
    } else if (id == 0x5F3) {
      rx5f3Count++;
    } else if (id == 0x6F3) {
      rx6f3Count++;
    } else if (id == 0x000) {
      rx000Count++;
    }

    if (id == UDS_RES_ID) {
      handleUdsResponse(len, data);
    }

    recordRxProbeFrame(id, len, data);
    recordStateProbeFrame(id, len, data);
    recordHoldTestFrame(id, len, data);
    recordDiagEmuFrame(id, len, data);
    recordGwDocFrame(id, len, data);
  }
}

static void printEflgDecode(byte eflg) {
  if (eflg == 0) {
    Serial.print(F(" none"));
    return;
  }

  if (eflg & 0x80) Serial.print(F(" RX1OVR"));
  if (eflg & 0x40) Serial.print(F(" RX0OVR"));
  if (eflg & 0x20) Serial.print(F(" TXBO"));
  if (eflg & 0x10) Serial.print(F(" TXEP"));
  if (eflg & 0x08) Serial.print(F(" RXEP"));
  if (eflg & 0x04) Serial.print(F(" TXWAR"));
  if (eflg & 0x02) Serial.print(F(" RXWAR"));
  if (eflg & 0x01) Serial.print(F(" EWARN"));
}

static void printGroupStats(const __FlashStringHelper *name, TxGroup group) {
  Serial.print(F(" "));
  Serial.print(name);
  Serial.print('=');
  Serial.print(txGroupOk[group]);
  Serial.print('/');
  Serial.print(txGroupFail[group]);
}

static void printCanHealthCompact() {
  Serial.print(F(" txOk="));
  Serial.print(txOk);
  Serial.print(F(" txFail="));
  Serial.print(txFail);
  Serial.print(F(" EFLG=0x"));
  printHex2(readRegister(0x2D));
  Serial.print(F(" TEC="));
  Serial.print(readRegister(0x1C));
  Serial.print(F(" REC="));
  Serial.print(readRegister(0x1D));
}

static void send3c0Mode() {
  if (mode == MODE_STOP) {
    return;
  }

  byte data[4];
  if (mode == MODE_RUN || mode == MODE_RUN_PULSE) {
    data[0] = 0x00;
    data[1] = 0x00;
    data[2] = 0xFF;
    data[3] = 0xFF;
  } else {
    data[0] = 0xFF;
    data[1] = 0xFF;
    data[2] = 0x00;
    data[3] = 0x00;
  }

  sendFrame(0x3C0, data, 4, TX_3C0);
}

static void sendContextFrames() {
  if (!runContextReady() || profile == PROFILE_3C0_ONLY) {
    return;
  }

  byte wake2c3[8] = {0x07, 0x00, 0x00, rolling, 0x00, 0x00, 0x00, 0x00};
  sendFrame(0x2C3, wake2c3, 8, TX_CONTEXT);

  if (profile == PROFILE_3C0_2C3_6C0 || profile == PROFILE_FULL_CONTEXT) {
    byte light6c0[8] = {0x01, 0x00, 0xFF, rolling, 0x00, 0x00, 0x00, 0x00};
    sendFrame(0x6C0, light6c0, 8, TX_CONTEXT);
  }

  rolling++;
}

static void sendNmFrame() {
  if (!runContextReady() || profile != PROFILE_FULL_CONTEXT) {
    return;
  }

  byte data[8] = {0x00, 0x00, 0x00, 0x00, nmCounter, 0x00, rolling, 0x00};
  sendFrame(0x000, data, 8, TX_NM);
  nmCounter = (nmCounter + 1) & 0x0F;
}

static void sendGatewayCandidateFrames() {
  if (!runContextReady() || gatewayCandidate == GW_NONE) {
    return;
  }

  byte data[8] = {0x00, 0x00, 0x00, nmCounter, rolling, 0x00, 0x00, 0x00};

  if (gatewayCandidate == GW_5F3 || gatewayCandidate == GW_BOTH) {
    sendFrame(0x5F3, data, 8, TX_GATEWAY);
  }
  if (gatewayCandidate == GW_6F3 || gatewayCandidate == GW_BOTH) {
    sendFrame(0x6F3, data, 8, TX_GATEWAY);
  }
}

static void sendGatewayDocFrames() {
  if (!gwDocRunActive || !isRunMode()) {
    return;
  }

  unsigned long now = millis();
  unsigned long dt5e4 = gwDocLast5e4Ms == 0 ? 0 : now - gwDocLast5e4Ms;
  unsigned long dt5f3 = gwDocLast5f3Ms == 0 ? 0 : now - gwDocLast5f3Ms;
  byte rcHigh = (byte)((rolling & 0x0F) << 4);
  byte cpData[8] = {0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, rcHigh};
  byte nmData[8] = {0x14, 0x01, 0x00, 0x00, nmCounter, 0x00, rcHigh, 0x00};
  sendFrame(0x5E4, cpData, 8, TX_GATEWAY);
  gwDocLast5e4Ms = now;
  sendFrame(0x5F3, nmData, 8, TX_GATEWAY);
  gwDocLast5f3Ms = now;
  gwDocLastCpCounter = cpData[7];
  gwDocLastNmByte6 = nmData[6];
  gwDocLastNmCounter = nmCounter;

  if (gwDocRunMs != 0 && now - gwDocRunMs <= 1000UL) {
    Serial.print(F("GWDOC TX dt5E4="));
    Serial.print(dt5e4);
    Serial.print(F(" dt5F3="));
    Serial.print(dt5f3);
    Serial.print(F(" 5E4.b7=0x"));
    printHex2(cpData[7]);
    Serial.print(F(" 5F3.b6=0x"));
    printHex2(nmData[6]);
    Serial.print(F(" nmCounter="));
    Serial.println(nmCounter);
  }

  rolling++;
  nmCounter = (nmCounter + 1) & 0x0F;
}

static void sendVehicleFrameSet(VehicleCandidate set) {
  if (!runContextReady() || set == VEH_NONE) {
    return;
  }

  if (set == VEH_KOMBI_REPEAT || set == VEH_ALL) {
    byte data30b[8] = {0x00, 0x00, 0x01, 0x00, 0x00, rolling, 0x00, 0x80};
    byte data5f2[2] = {0x03, rolling};
    sendFrame(0x30B, data30b, 8, TX_CONTEXT);
    sendFrame(0x5F2, data5f2, 2, TX_CONTEXT);
  }

  if (set == VEH_STATUS_LOW || set == VEH_ALL) {
    byte data5f5[8] = {0xFE, 0x07, 0xF8, 0xDF, 0xFF, 0xFF, 0xDF, rolling};
    byte data5f7[8] = {0x00, 0xFF, 0xFB, 0xDF, 0xFF, 0xFE, 0xFF, rolling};
    byte data65e[8] = {0x88, 0x08, 0x56, 0x3B, 0xC2, 0x6D, rolling, 0x00};
    sendFrame(0x5F5, data5f5, 8, TX_CONTEXT);
    sendFrame(0x5F7, data5f7, 8, TX_CONTEXT);
    sendFrame(0x65E, data65e, 8, TX_CONTEXT);
  }

  if (set == VEH_DRIVETRAIN || set == VEH_ALL) {
    byte data630[8] = {0x33, 0xC2, 0x03, 0x00, 0x0F, 0x00, rolling, 0x03};
    byte data62d[8] = {0x34, 0x82, 0x03, 0x00, 0x12, 0x00, rolling, 0x00};
    byte data62f[5] = {0x44, 0x51, 0x00, rolling, 0x00};
    sendFrame(0x630, data630, 8, TX_CONTEXT);
    sendFrame(0x62D, data62d, 8, TX_CONTEXT);
    sendFrame(0x62F, data62f, 5, TX_CONTEXT);
  }
}

static void sendGaugeProbeFrames(unsigned long elapsedMs) {
  unsigned int rpmRaw = 2800U * 4U;
  unsigned int speedRaw = 80U * 148U;
  static unsigned int distanceCounter = 0;

  if (elapsedMs < 3000UL) {
    byte rpm280[8] = {
      0x49, 0x0E,
      (byte)(rpmRaw & 0xFF), (byte)((rpmRaw >> 8) & 0xFF),
      0x0E, 0x00, 0x1B, 0x0E
    };
    byte speed5a0[8] = {
      0xFF,
      (byte)(speedRaw & 0xFF), (byte)((speedRaw >> 8) & 0xFF),
      0x00, 0x00,
      (byte)(distanceCounter & 0xFF), (byte)((distanceCounter >> 8) & 0xFF),
      0xAD
    };
    distanceCounter += 8;
    sendFrame(0x280, rpm280, 8, TX_CONTEXT);
    sendFrame(0x5A0, speed5a0, 8, TX_CONTEXT);
    return;
  }

  if (elapsedMs < 6000UL) {
    byte coolant288[8] = {0x00, 0xA2, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
    byte oil588[8] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 150};
    sendFrame(0x288, coolant288, 8, TX_CONTEXT);
    sendFrame(0x588, oil588, 8, TX_CONTEXT);
    return;
  }

  byte data630[8] = {0x33, 0xC2, 0x03, 0x00, 0x0F, 0x00, rolling, 0x03};
  byte data62d[8] = {0x34, 0x82, 0x03, 0x00, 0x12, 0x00, rolling, 0x00};
  byte data62f[5] = {0x44, 0x51, 0x00, rolling, 0x00};
  sendFrame(0x630, data630, 8, TX_CONTEXT);
  sendFrame(0x62D, data62d, 8, TX_CONTEXT);
  sendFrame(0x62F, data62f, 5, TX_CONTEXT);
  rolling++;
}

static const __FlashStringHelper *candScanName(byte index) {
  switch (index) {
    case 0:
      return F("2c0 terminal");
    case 1:
      return F("3c3 key");
    case 2:
      return F("5f3 B");
    case 3:
      return F("6f3 B");
    case 4:
      return F("5f3+6f3 B");
    case 5:
      return F("2c0+3c3");
    case 6:
      return F("2c0+3c3+gwB");
    case 7:
      return F("2c0+3c3+gwB+100");
    case 8:
      return F("2c0 terminal high");
    case 9:
      return F("3c3 key high");
    case 10:
      return F("5f3 high");
    case 11:
      return F("2c0+3c3+5f3 high");
    case 12:
      return F("2c0+3c3+5f3+100 high");
    default:
      return F("none");
  }
}

static void sendCandScanFrames(byte index) {
  if (!runContextReady()) {
    return;
  }

  byte rc = rolling & 0x0F;
  byte lowCounter = rc;
  byte highCounter = (byte)(rc << 4);

  if (index == 0 || index == 5 || index == 6 || index == 7) {
    byte data2c0[8] = {0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, lowCounter};
    sendFrame(0x2C0, data2c0, 8, TX_CONTEXT);
  }

  if (index == 8 || index == 11 || index == 12) {
    byte data2c0High[8] = {0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, highCounter};
    sendFrame(0x2C0, data2c0High, 8, TX_CONTEXT);
  }

  if (index == 1 || index == 5 || index == 6 || index == 7) {
    byte data3c3[8] = {0x01, 0x1A, 0x00, 0x00, 0x00, 0x00, 0x00, lowCounter};
    sendFrame(0x3C3, data3c3, 8, TX_CONTEXT);
  }

  if (index == 9 || index == 11 || index == 12) {
    byte data3c3High[8] = {0x01, 0x1A, 0x00, 0x00, 0x00, 0x00, 0x00, highCounter};
    sendFrame(0x3C3, data3c3High, 8, TX_CONTEXT);
  }

  if (index == 2 || index == 4 || index == 6 || index == 7) {
    byte data5f3[8] = {0x14, 0x01, 0x00, 0x00, 0x00, 0x00, lowCounter, 0x00};
    sendFrame(0x5F3, data5f3, 8, TX_GATEWAY);
  }

  if (index == 10 || index == 11 || index == 12) {
    byte data5f3High[8] = {0x14, 0x01, 0x00, 0x00, nmCounter, 0x00, highCounter, 0x00};
    sendFrame(0x5F3, data5f3High, 8, TX_GATEWAY);
  }

  if (index == 3 || index == 4 || index == 6 || index == 7) {
    byte data6f3[8] = {0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
    sendFrame(0x6F3, data6f3, 8, TX_GATEWAY);
  }

  if (index == 7) {
    byte data100[8] = {0x00, 0x00, 0x13, 0x88, 0x00, 0x00, 0x00, lowCounter};
    sendFrame(0x100, data100, 8, TX_CONTEXT);
  }

  if (index == 12) {
    byte data100High[8] = {0x00, 0x00, 0x13, 0x88, 0x00, 0x00, 0x00, highCounter};
    sendFrame(0x100, data100High, 8, TX_CONTEXT);
  }

  nmCounter = (nmCounter + 1) & 0x0F;
}

static const __FlashStringHelper *cpScanName(byte index) {
  switch (index) {
    case 0:
      return F("5e4 0100 low");
    case 1:
      return F("5e4 0100 high");
    case 2:
      return F("5e4 0001 low");
    case 3:
      return F("5e4 0001 high");
    case 4:
      return F("553 0100 high");
    case 5:
      return F("553 0001 high");
    case 6:
      return F("653 immo high");
    case 7:
      return F("5e4high+653high");
    case 8:
      return F("553high+653high");
    default:
      return F("none");
  }
}

static void sendCpScanFrames(byte index) {
  if (!runContextReady()) {
    return;
  }

  byte rc = rolling & 0x0F;
  byte rcHigh = (byte)(rc << 4);

  if (index == 0) {
    byte data5e4a[8] = {0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, rc};
    sendFrame(0x5E4, data5e4a, 8, TX_GATEWAY);
  }

  if (index == 1 || index == 7) {
    byte data5e4aHigh[8] = {0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, rcHigh};
    sendFrame(0x5E4, data5e4aHigh, 8, TX_GATEWAY);
  }

  if (index == 2) {
    byte data5e4b[8] = {0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, rc};
    sendFrame(0x5E4, data5e4b, 8, TX_GATEWAY);
  }

  if (index == 3) {
    byte data5e4bHigh[8] = {0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, rcHigh};
    sendFrame(0x5E4, data5e4bHigh, 8, TX_GATEWAY);
  }

  if (index == 4 || index == 8) {
    byte data553aHigh[8] = {0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, rcHigh};
    sendFrame(0x553, data553aHigh, 8, TX_GATEWAY);
  }

  if (index == 5) {
    byte data553bHigh[8] = {0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, rcHigh};
    sendFrame(0x553, data553bHigh, 8, TX_GATEWAY);
  }

  if (index == 6 || index == 7 || index == 8) {
    byte data653High[8] = {0x02, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, (byte)(((rc + 1) & 0x0F) << 4)};
    sendFrame(0x653, data653High, 8, TX_GATEWAY);
  }
}

static void sendAirbagFrame() {
  if (mode == MODE_STOP || profile != PROFILE_FULL_CONTEXT) {
    return;
  }

  byte data[8] = {0x00, 0x00, 0x00, 0x00, rolling, 0x00, 0x00, 0x00};
  sendFrame(0x050, data, 8, TX_NM);
}

static void sendTimeFrame() {
  if (mode == MODE_STOP || profile != PROFILE_FULL_CONTEXT) {
    return;
  }

  byte data[8] = {0x12, 0x00, 0x01, 0x01, 0x16, 0x00, 0x00, rolling};
  sendFrame(0x621, data, 8, TX_NM);
}

static void sendTesterPresent() {
  if (!testerPresentEnabled || mode == MODE_STOP) {
    return;
  }

  byte data[8] = {0x02, 0x3E, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
  sendFrame(UDS_REQ_ID, data, 8, TX_UDS);
}

static void sendUds(const byte *payload, byte payloadLen, const __FlashStringHelper *label) {
  byte data[8] = {0};
  data[0] = payloadLen;
  for (byte i = 0; i < payloadLen && i < 7; i++) {
    data[i + 1] = payload[i];
  }

  Serial.print(F("REQ "));
  Serial.println(label);
  quietTesterUntilMs = millis() + 1800UL;
  sendFrame(UDS_REQ_ID, data, 8, TX_UDS);
}

static void sendDtcDetail(byte subFunction, unsigned long dtc, byte recordNumber) {
  byte payload[5] = {
    0x19,
    subFunction,
    (byte)((dtc >> 16) & 0xFF),
    (byte)((dtc >> 8) & 0xFF),
    (byte)(dtc & 0xFF)
  };

  byte data[8] = {0};
  data[0] = 0x06;
  for (byte i = 0; i < 5; i++) {
    data[i + 1] = payload[i];
  }
  data[6] = recordNumber;

  Serial.print(F("REQ DTC detail 19 "));
  printHex2(subFunction);
  Serial.print(F(" "));
  if (dtc < 0x100000UL) {
    Serial.print('0');
  }
  Serial.print(dtc, HEX);
  Serial.print(F(" rec "));
  printHex2(recordNumber);
  Serial.println();

  quietTesterUntilMs = millis() + 1800UL;
  sendFrame(UDS_REQ_ID, data, 8, TX_UDS);
}

static void readDtc(byte mask) {
  byte payload[3] = {0x19, 0x02, mask};
  if (mask == 0x09) {
    sendUds(payload, 3, F("DTC 19 02 09"));
  } else if (mask == 0x2F) {
    sendUds(payload, 3, F("DTC 19 02 2F"));
  } else {
    sendUds(payload, 3, F("DTC 19 02 FF"));
  }
}

static void readDtcSnapshotIdentification() {
  byte payload[2] = {0x19, 0x03};
  sendUds(payload, 2, F("DTC SNAPSHOT IDENTIFICATION 19 03"));
}

static void readDid(unsigned int did) {
  byte payload[3] = {0x22, (byte)((did >> 8) & 0xFF), (byte)(did & 0xFF)};
  Serial.print(F("DID 0x"));
  Serial.println(did, HEX);
  sendUds(payload, 3, F("READ DID 22"));
}

static void startDtcBurst() {
  dtcBurstActive = true;
  dtcBurstStep = 0;
  lastDtcBurstMs = 0;
  quietTesterUntilMs = millis() + 7000UL;
  Serial.println(F("DTC burst started"));
}

static void startDtcExtendedBurst() {
  dtcBurstActive = false;
  dtcSnapBurstActive = false;
  dtcExtBurstActive = true;
  dtcDetailStep = 0;
  lastDtcDetailMs = 0;
  quietTesterUntilMs = millis() + 16000UL;
  Serial.println(F("DTC extended-data burst started"));
}

static void startDtcSnapshotBurst() {
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = true;
  dtcDetailStep = 0;
  lastDtcDetailMs = 0;
  quietTesterUntilMs = millis() + 16000UL;
  Serial.println(F("DTC snapshot-data burst started"));
}

static unsigned long detailDtcByStep(byte step) {
  switch (step) {
    case 0:
      return 0xEA6100UL;
    case 1:
      return 0xA00044UL;
    case 2:
      return 0x100004UL;
    case 3:
      return 0xFFFF00UL;
    case 4:
      return 0xFFFF01UL;
    case 5:
      return 0xFFFF02UL;
    case 6:
      return 0xFFFF07UL;
    case 7:
      return 0xFFFF08UL;
    case 8:
      return 0xFFFF09UL;
    case 9:
      return 0xFFFF12UL;
    default:
      return 0;
  }
}

static void pollDtcDetailBurst(unsigned long now) {
  if ((!dtcExtBurstActive && !dtcSnapBurstActive) || now - lastDtcDetailMs < 1500) {
    return;
  }

  unsigned long dtc = detailDtcByStep(dtcDetailStep);
  if (dtc == 0) {
    dtcExtBurstActive = false;
    dtcSnapBurstActive = false;
    Serial.println(F("DTC detail burst done"));
    return;
  }

  lastDtcDetailMs = now;
  sendDtcDetail(dtcExtBurstActive ? 0x06 : 0x04, dtc, dtcExtBurstActive ? 0xFF : 0x01);
  dtcDetailStep++;
}

static void pollDtcBurst(unsigned long now) {
  if (!dtcBurstActive || now - lastDtcBurstMs < 1400) {
    return;
  }

  lastDtcBurstMs = now;
  switch (dtcBurstStep) {
    case 0:
      readDtc(0xFF);
      break;
    case 1:
      readDtc(0x09);
      break;
    case 2:
      readDtc(0x2F);
      break;
    case 3:
      readDtc(0xFF);
      break;
    default:
      dtcBurstActive = false;
      Serial.println(F("DTC burst done"));
      return;
  }

  dtcBurstStep++;
}

static void extendedSession() {
  const byte payload[2] = {0x10, 0x03};
  sendUds(payload, 2, F("EXTENDED SESSION 10 03"));
}

static void printStatus() {
  const byte eflg = readRegister(0x2D);
  const byte tec = readRegister(0x1C);
  const byte rec = readRegister(0x1D);
  const byte canintf = readRegister(0x2C);

  Serial.print(F("STATUS systemEmu mode="));
  Serial.print(modeName());
  Serial.print(F(" profile="));
  Serial.print(profileName());
  Serial.print(F(" gw="));
  Serial.print(gatewayCandidateName());
  Serial.print(F(" veh="));
  Serial.print(vehicleCandidateName());
  Serial.print(F(" tester="));
  Serial.print(testerPresentEnabled ? F("on") : F("off"));
  Serial.print(F(" slow="));
  Serial.print(slowTx ? F("on") : F("off"));
  Serial.print(F(" i3c0="));
  Serial.print(threeC0IntervalMs());
  Serial.print(F(" rx="));
  Serial.print(rxCount);
  Serial.print(F(" rxIds 3c0="));
  Serial.print(rx3c0Count);
  Serial.print(F(" 5f3="));
  Serial.print(rx5f3Count);
  Serial.print(F(" 6f3="));
  Serial.print(rx6f3Count);
  Serial.print(F(" 000="));
  Serial.print(rx000Count);
  Serial.print(F(" txOk="));
  Serial.print(txOk);
  Serial.print(F(" txFail="));
  Serial.print(txFail);
  Serial.print(F(" testerOk="));
  Serial.print(testerOkCount);
  Serial.print(F(" EFLG=0x"));
  printHex2(eflg);
  Serial.print(F("["));
  printEflgDecode(eflg);
  Serial.print(F(" ]"));
  Serial.print(F(" TEC="));
  Serial.print(tec);
  Serial.print(F(" REC="));
  Serial.print(rec);
  Serial.print(F(" CANINTF=0x"));
  printHex2(canintf);
  Serial.print(F(" groups"));
  printGroupStats(F("3c0"), TX_3C0);
  printGroupStats(F("ctx"), TX_CONTEXT);
  printGroupStats(F("nm"), TX_NM);
  printGroupStats(F("gw"), TX_GATEWAY);
  printGroupStats(F("uds"), TX_UDS);
  Serial.println();
}

static void startRunPulse() {
  mode = MODE_RUN_PULSE;
  runStartedMs = millis();
  Serial.println(F("MODE run pulse: 3C0#0000FFFF for 8s"));
}

static void startDemoMode() {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  holdTestRunWatch = false;
  clearHoldExtras();
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = false;

  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;
  testerPresentEnabled = false;
  slowTx = true;
  suppressPeriodicStatus = false;

  mode = MODE_RUN;
  runStartedMs = millis();
  demoLastRefreshMs = millis();
  demoStandbyStartedMs = 0;
  demoModeActive = true;
  demoStandbyPulse = false;
  gaugeTestActive = false;
  dossierActive = false;
  didSweepActive = false;
  diagEmuActive = false;
  gwDocActive = false;
  gwDocRunActive = false;

  sendOne3c0Run();
  Serial.println(F("DEMO mode: 3c0-only run, refresh before SAFE"));
}

static void startGaugeTest() {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  holdTestRunWatch = false;
  demoModeActive = false;
  demoStandbyPulse = false;
  dossierActive = false;
  didSweepActive = false;
  diagEmuActive = false;
  gwDocActive = false;
  gwDocRunActive = false;
  clearHoldExtras();
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = false;

  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;
  testerPresentEnabled = false;
  slowTx = true;
  suppressPeriodicStatus = false;

  mode = MODE_STANDBY;
  sendOne3c0Standby();
  gaugeTestActive = true;
  gaugeTestStep = 0;
  gaugeTestPhase = 0;
  gaugeTestNextMs = millis() + 5000UL;
  lastGaugeTxMs = 0;
  Serial.println(F("GAUGE TEST START: gentle standby 5s"));
}

static void startAdaptationDossier() {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  holdTestRunWatch = false;
  demoModeActive = false;
  demoStandbyPulse = false;
  gaugeTestActive = false;
  dossierActive = false;
  didSweepActive = false;
  diagEmuActive = false;
  gwDocActive = false;
  gwDocRunActive = false;
  clearHoldExtras();
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = false;

  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;
  testerPresentEnabled = true;
  slowTx = true;
  suppressPeriodicStatus = false;

  mode = MODE_STANDBY;
  sendOne3c0Standby();
  dossierActive = true;
  dossierStep = 0;
  lastDossierMs = millis();
  quietTesterUntilMs = millis() + 1500UL;
  Serial.println(F("ADAPTATION DOSSIER START: read-only, standby first"));
}

static void startDidSweep() {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  holdTestRunWatch = false;
  demoModeActive = false;
  demoStandbyPulse = false;
  gaugeTestActive = false;
  dossierActive = false;
  didSweepActive = false;
  diagEmuActive = false;
  gwDocActive = false;
  gwDocRunActive = false;
  clearHoldExtras();
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = false;

  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;
  testerPresentEnabled = true;
  slowTx = true;
  suppressPeriodicStatus = false;

  mode = MODE_STANDBY;
  sendOne3c0Standby();
  didSweepActive = true;
  didSweepIndex = 0;
  lastDidSweepMs = millis();
  quietTesterUntilMs = millis() + 1500UL;
  Serial.println(F("DID SWEEP START: F180..F1AF read-only"));
}

static void startDiagEmu(byte variant) {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  holdTestRunWatch = false;
  demoModeActive = false;
  demoStandbyPulse = false;
  gaugeTestActive = false;
  dossierActive = false;
  didSweepActive = false;
  diagEmuActive = false;
  gwDocActive = false;
  gwDocRunActive = false;
  clearHoldExtras();
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = false;

  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;
  testerPresentEnabled = true;
  slowTx = true;
  suppressPeriodicStatus = false;
  diagEmuVariant = variant;

  diagEmuSafeSeen = false;
  diagLast30BLen = 0;
  for (byte i = 0; i < 8; i++) {
    diagLast30B[i] = 0;
  }

  mode = MODE_STANDBY;
  sendOne3c0Standby();
  diagEmuActive = true;
  diagEmuStep = 0;
  lastDiagEmuMs = millis();
  lastDiagEmuTesterMs = 0;
  lastDiagEmuDtcMs = 0;
  quietTesterUntilMs = millis() + 1000UL;
  if (variant == 2) {
    Serial.println(F("DIAGEMU3 START: IDs, tester-present, DID ping run"));
  } else if (variant == 1) {
    Serial.println(F("DIAGEMU2 START: IDs, tester-present, quiet run"));
  } else {
    Serial.println(F("DIAGEMU START: standby, extended session, tester-present, then run"));
  }
}

static void startGatewayDocTest() {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  holdTestRunWatch = false;
  demoModeActive = false;
  demoStandbyPulse = false;
  gaugeTestActive = false;
  dossierActive = false;
  didSweepActive = false;
  diagEmuActive = false;
  gwDocActive = false;
  gwDocRunActive = false;
  clearHoldExtras();
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = false;

  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;
  testerPresentEnabled = false;
  slowTx = false;
  suppressPeriodicStatus = false;
  rolling = 0;
  nmCounter = 0;

  gwDocActive = true;
  gwDocRunActive = false;
  gwDocSafeSeen = false;
  gwDocStep = 0;
  gwDocNextMs = millis();
  gwDocRunMs = 0;
  gwDocSafeAtMs = 0;
  lastGwDocMs = 0;
  gwDocLast5e4Ms = 0;
  gwDocLast5f3Ms = 0;
  gwDocLast30BLen = 0;
  gwDocLastCpCounter = 0;
  gwDocLastNmByte6 = 0;
  gwDocLastNmCounter = 0;
  gwDocDtcRequested = false;
  for (byte i = 0; i < 8; i++) {
    gwDocLast30B[i] = 0;
  }

  Serial.println(F("GWDOC START: test 5E4+5F3 from first RUN ms"));
}

static void pollAdaptationDossier(unsigned long now) {
  if (!dossierActive || now - lastDossierMs < 1500UL) {
    return;
  }

  lastDossierMs = now;
  switch (dossierStep) {
    case 0:
      extendedSession();
      break;
    case 1:
      readDid(0xF190); // VIN
      break;
    case 2:
      readDid(0xF187); // spare part number candidate
      break;
    case 3:
      readDid(0xF188); // software number candidate
      break;
    case 4:
      readDid(0xF189); // software version candidate
      break;
    case 5:
      readDid(0xF18A); // supplier / system candidate
      break;
    case 6:
      readDid(0xF191); // hardware number candidate
      break;
    case 7:
      readDtc(0xFF);
      break;
    case 8:
      readDtc(0x09);
      break;
    default:
      dossierActive = false;
      Serial.println(F("ADAPTATION DOSSIER COMPLETE"));
      return;
  }

  dossierStep++;
}

static void pollDidSweep(unsigned long now) {
  if (!didSweepActive || now - lastDidSweepMs < 1800UL) {
    return;
  }

  lastDidSweepMs = now;
  if (didSweepIndex == 0) {
    extendedSession();
    didSweepIndex++;
    return;
  }

  byte offset = didSweepIndex - 1;
  if (offset >= 0x30) {
    didSweepActive = false;
    Serial.println(F("DID SWEEP COMPLETE"));
    return;
  }

  readDid(0xF180U + offset);
  didSweepIndex++;
}

static void pollDiagEmu(unsigned long now) {
  if (!diagEmuActive) {
    return;
  }

  if (testerPresentEnabled && now - lastDiagEmuTesterMs >= 1000UL && now >= quietTesterUntilMs) {
    lastDiagEmuTesterMs = now;
    sendTesterPresent();
  }

  switch (diagEmuStep) {
    case 0:
      if (now - lastDiagEmuMs < 1500UL) {
        return;
      }
      lastDiagEmuMs = now;
      extendedSession();
      diagEmuStep++;
      return;
    case 1:
      if (now - lastDiagEmuMs < 1500UL) {
        return;
      }
      lastDiagEmuMs = now;
      if (diagEmuVariant != 0) {
        readDid(0xF187);
        diagEmuStep++;
        return;
      }
      readDtc(0x09);
      diagEmuStep++;
      return;
    case 2:
      if (now - lastDiagEmuMs < 1500UL) {
        return;
      }
      lastDiagEmuMs = now;
      if (diagEmuVariant != 0) {
        readDid(0xF189);
        diagEmuStep++;
        return;
      }
      sendOne3c0Run();
      mode = MODE_RUN;
      runStartedMs = now;
      diagEmuRunMs = now;
      Serial.println(F("DIAGEMU RUN: monitor 30B and DTC for 12s"));
      diagEmuStep = 6;
      return;
    case 3:
      if (now - lastDiagEmuMs < 1500UL) {
        return;
      }
      lastDiagEmuMs = now;
      readDid(0xF19E);
      diagEmuStep++;
      return;
    case 4:
      if (now - lastDiagEmuMs < 1500UL) {
        return;
      }
      lastDiagEmuMs = now;
      readDid(0xF1AA);
      diagEmuStep++;
      return;
    case 5:
      if (now - lastDiagEmuMs < 1500UL) {
        return;
      }
      lastDiagEmuMs = now;
      sendOne3c0Run();
      mode = MODE_RUN;
      runStartedMs = now;
      diagEmuRunMs = now;
      Serial.println(diagEmuVariant == 2 ? F("DIAGEMU3 RUN: monitor 30B with DID ping for 12s") :
                                           F("DIAGEMU2 RUN: monitor 30B quietly for 12s"));
      diagEmuStep++;
      return;
    case 6:
      if (diagEmuVariant == 0 && now - lastDiagEmuDtcMs >= 3000UL) {
        lastDiagEmuDtcMs = now;
        readDtc(0x09);
      } else if (diagEmuVariant == 2 && now - lastDiagEmuDtcMs >= 3000UL) {
        lastDiagEmuDtcMs = now;
        if (((now - diagEmuRunMs) / 3000UL) & 0x01) {
          readDid(0xF187);
        } else {
          readDid(0xF1AA);
        }
      }
      if (now - diagEmuRunMs < 12000UL) {
        return;
      }
      if (diagEmuVariant != 0) {
        readDtc(0x09);
        lastDiagEmuMs = now;
        diagEmuStep = 7;
        return;
      }
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.print(F("DIAGEMU RESULT safeSeen="));
      Serial.print(diagEmuSafeSeen ? F("yes") : F("no"));
      Serial.print(F(" last30B="));
      printHexBytes(diagLast30BLen, diagLast30B);
      Serial.println();
      diagEmuActive = false;
      Serial.println(F("DIAGEMU COMPLETE"));
      return;
    case 7:
      if (now - lastDiagEmuMs < 1800UL) {
        return;
      }
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.print(F("DIAGEMU RESULT safeSeen="));
      Serial.print(diagEmuSafeSeen ? F("yes") : F("no"));
      Serial.print(F(" last30B="));
      printHexBytes(diagLast30BLen, diagLast30B);
      Serial.println();
      diagEmuActive = false;
      Serial.println(F("DIAGEMU COMPLETE"));
      return;
  }
}

static void pollGatewayDocTest(unsigned long now) {
  if (!gwDocActive || now < gwDocNextMs) {
    return;
  }

  switch (gwDocStep) {
    case 0:
      resetBenchCanState();
      gwDocActive = true;
      gwDocStep++;
      gwDocNextMs = millis() + 2500UL;
      return;
    case 1:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.println(F("GWDOC standby clean 5s"));
      gwDocStep++;
      gwDocNextMs = millis() + 5000UL;
      return;
    case 2:
      mode = MODE_RUN;
      gwDocRunActive = true;
      gwDocRunMs = millis();
      runStartedMs = gwDocRunMs;
      lastGwDocMs = 0;
      Serial.print(F("GWDOC RUN startMs="));
      Serial.println(gwDocRunMs);
      Serial.println(F("GWDOC FIRST 5E4#0100000000000000"));
      Serial.print(F("GWDOC FIRST 5F3#14010000"));
      printHex2(nmCounter);
      Serial.println(F("000000"));
      Serial.println(F("GWDOC FIRST 3C0#0000FFFF"));
      sendGatewayDocFrames();
      lastGwDocMs = millis();
      sendOne3c0Run();
      Serial.println(F("GWDOC RUN: 5E4+5F3 every 100ms for 12s"));
      gwDocStep++;
      gwDocNextMs = millis() + 12000UL;
      return;
    case 3:
      gwDocDtcRequested = true;
      readDtc(0x09);
      gwDocStep++;
      gwDocNextMs = millis() + 1800UL;
      return;
    default:
      gwDocRunActive = false;
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.print(F("GWDOC RESULT safeSeen="));
      Serial.print(gwDocSafeSeen ? F("yes") : F("no"));
      Serial.print(F(" timeToSafeMs="));
      Serial.print(gwDocSafeSeen ? gwDocSafeAtMs : 0);
      Serial.print(F(" last30B="));
      printHexBytes(gwDocLast30BLen, gwDocLast30B);
      Serial.print(F(" txFail="));
      Serial.print(txFail);
      Serial.print(F(" tester=off dtcReq="));
      Serial.print(gwDocDtcRequested ? F("yes") : F("no"));
      Serial.print(F(" testerOk="));
      Serial.print(testerOkCount);
      Serial.println();
      gwDocActive = false;
      Serial.println(F("GWDOC COMPLETE"));
      return;
  }
}

static void pollGaugeTest(unsigned long now) {
  if (!gaugeTestActive) {
    return;
  }

  if (gaugeTestStep == 0 && now >= gaugeTestNextMs) {
    sendOne3c0Run();
    mode = MODE_RUN;
    runStartedMs = now;
    gaugeTestRunMs = now;
    gaugeTestStep = 1;
    Serial.println(F("GAUGE phase 1: 0x280 rpm + 0x5A0 speed"));
    return;
  }

  if (gaugeTestStep == 1) {
    unsigned long elapsed = now - gaugeTestRunMs;

    byte phase = elapsed < 3000UL ? 1 : (elapsed < 6000UL ? 2 : 3);
    if (phase != gaugeTestPhase) {
      gaugeTestPhase = phase;
      if (phase == 2) {
        Serial.println(F("GAUGE phase 2: 0x288 coolant + 0x588 oil"));
      } else if (phase == 3) {
        Serial.println(F("GAUGE phase 3: 0x630/0x62D/0x62F drivetrain candidates"));
      }
    }

    if (now - lastGaugeTxMs >= 100UL) {
      lastGaugeTxMs = now;
      sendGaugeProbeFrames(elapsed);
    }

    if (elapsed >= 9500UL) {
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      gaugeTestActive = false;
      Serial.println(F("GAUGE TEST COMPLETE: standby"));
    }
  }
}

static void pollDemoMode(unsigned long now) {
  if (!demoModeActive) {
    return;
  }

  if (demoStandbyPulse) {
    if (now - demoStandbyStartedMs >= DEMO_STANDBY_MS) {
      mode = MODE_RUN;
      runStartedMs = now;
      demoLastRefreshMs = now;
      demoStandbyPulse = false;
      sendOne3c0Run();
      Serial.println(F("DEMO return run"));
    }
    return;
  }

  if (mode == MODE_RUN && now - demoLastRefreshMs >= DEMO_REFRESH_MS) {
    mode = MODE_STANDBY;
    demoStandbyStartedMs = now;
    demoStandbyPulse = true;
    sendOne3c0Standby();
    Serial.println(F("DEMO refresh standby pulse"));
  }
}

static void cycleProfile() {
  profile = (Profile)((profile + 1) % 4);
  Serial.print(F("PROFILE "));
  Serial.println(profileName());
}

static void cycleGatewayCandidate() {
  gatewayCandidate = (GatewayCandidate)((gatewayCandidate + 1) % 4);
  Serial.print(F("GW "));
  Serial.println(gatewayCandidateName());
}

static void cycleVehicleCandidate() {
  vehicleCandidate = (VehicleCandidate)((vehicleCandidate + 1) % 5);
  Serial.print(F("VEH "));
  Serial.println(vehicleCandidateName());
}

static void enterHealthMode() {
  mode = MODE_STANDBY;
  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  holdTestRunWatch = false;
  demoModeActive = false;
  demoStandbyPulse = false;
  gaugeTestActive = false;
  dossierActive = false;
  didSweepActive = false;
  diagEmuActive = false;
  gwDocActive = false;
  gwDocRunActive = false;
  clearHoldExtras();
  testerPresentEnabled = false;
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = false;
  slowTx = true;
  Serial.println(F("HEALTH mode: standby, 3c0-only, gw none, tester off, slow on"));
}

static void enterQuietListenMode() {
  mode = MODE_STOP;
  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  holdTestRunWatch = false;
  demoModeActive = false;
  demoStandbyPulse = false;
  gaugeTestActive = false;
  dossierActive = false;
  didSweepActive = false;
  diagEmuActive = false;
  gwDocActive = false;
  gwDocRunActive = false;
  clearHoldExtras();
  testerPresentEnabled = false;
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = false;
  resetLocalStats();
  clearMcpFlags();
  Serial.println(F("QUIET listen: all TX off, RX/status only"));
}

static void resetBenchCanState() {
  mode = MODE_STOP;
  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  holdTestRunWatch = false;
  demoModeActive = false;
  demoStandbyPulse = false;
  gaugeTestActive = false;
  dossierActive = false;
  didSweepActive = false;
  diagEmuActive = false;
  gwDocActive = false;
  gwDocRunActive = false;
  clearHoldExtras();
  testerPresentEnabled = false;
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = false;
  slowTx = true;
  reinitCanController();
  Serial.println(F("BENCH reset: quiet, gw none, tester off, slow on"));
}

static void sendOne3c0Standby() {
  byte data[4] = {0xFF, 0xFF, 0x00, 0x00};
  sendFrame(0x3C0, data, 4, TX_3C0);
  Serial.println(F("ONE TX 3C0#FFFF0000 standby"));
}

static void sendOne3c0Run() {
  byte data[4] = {0x00, 0x00, 0xFF, 0xFF};
  sendFrame(0x3C0, data, 4, TX_3C0);
  runStartedMs = millis();
  Serial.println(F("ONE TX 3C0#0000FFFF run"));
}

static void cycleThreeC0Interval() {
  threeC0IntervalIndex = (threeC0IntervalIndex + 1) % 5;
  Serial.print(F("3C0 interval "));
  Serial.print(threeC0IntervalMs());
  Serial.println(F(" ms"));
}

static void startAutoTest() {
  autoTestActive = true;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  clearHoldExtras();
  suppressPeriodicStatus = false;
  autoTestStep = 0;
  autoTestNextMs = millis();
  Serial.println(F("AUTO TEST START"));
}

static void pollAutoTest(unsigned long now) {
  if (!autoTestActive || now < autoTestNextMs) {
    return;
  }

  switch (autoTestStep) {
    case 0:
      Serial.println(F("AUTO 0/6 reset CAN"));
      resetBenchCanState();
      autoTestActive = true;
      autoTestStep++;
      autoTestNextMs = millis() + 3000UL;
      return;
    case 1:
      Serial.println(F("AUTO 1/6 wake/run one-shot"));
      sendOne3c0Run();
      autoTestStep++;
      autoTestNextMs = millis() + 2000UL;
      return;
    case 2:
      Serial.println(F("AUTO 2/6 run hold"));
      mode = MODE_RUN;
      Serial.println(F("MODE run hold: 3C0#0000FFFF"));
      autoTestStep++;
      autoTestNextMs = millis() + 1500UL;
      return;
    case 3:
      Serial.println(F("AUTO 3/6 DTC list"));
      startDtcBurst();
      autoTestStep++;
      autoTestNextMs = millis() + 8500UL;
      return;
    case 4:
      Serial.println(F("AUTO 4/6 DTC extended data"));
      startDtcExtendedBurst();
      autoTestStep++;
      autoTestNextMs = millis() + 17000UL;
      return;
    case 5:
      Serial.println(F("AUTO 5/5 final status"));
      printStatus();
      mode = MODE_STOP;
      Serial.println(F("TEST COMPLETE"));
      autoTestActive = false;
      suppressPeriodicStatus = true;
      return;
  }
}

static void startProfileScan() {
  autoTestActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  clearHoldExtras();
  profileScanActive = true;
  profileScanStep = 0;
  profileScanNextMs = millis();
  suppressPeriodicStatus = false;
  Serial.println(F("PROFILE SCAN START"));
}

static void pollProfileScan(unsigned long now) {
  if (!profileScanActive || now < profileScanNextMs) {
    return;
  }

  switch (profileScanStep) {
    case 0:
      Serial.println(F("SCAN 0 reset CAN"));
      resetBenchCanState();
      profileScanActive = true;
      profileScanStep++;
      profileScanNextMs = millis() + 3000UL;
      return;
    case 1:
      profile = PROFILE_3C0_ONLY;
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.println(F("SCAN 1 standby before 3c0-only"));
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 2:
      Serial.println(F("SCAN 2 run profile 3c0-only"));
      sendOne3c0Run();
      mode = MODE_RUN;
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 3:
      Serial.println(F("SCAN 3 DTC profile 3c0-only"));
      printStatus();
      startDtcBurst();
      profileScanStep++;
      profileScanNextMs = millis() + 8500UL;
      return;
    case 4:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.println(F("SCAN 4 standby after 3c0-only"));
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 5:
      profile = PROFILE_3C0_2C3;
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.println(F("SCAN 5 standby before 3c0+2c3"));
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 6:
      Serial.println(F("SCAN 6 run profile 3c0+2c3"));
      sendOne3c0Run();
      mode = MODE_RUN;
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 7:
      Serial.println(F("SCAN 7 DTC profile 3c0+2c3"));
      printStatus();
      startDtcBurst();
      profileScanStep++;
      profileScanNextMs = millis() + 8500UL;
      return;
    case 8:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.println(F("SCAN 8 standby after 3c0+2c3"));
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 9:
      profile = PROFILE_3C0_2C3_6C0;
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.println(F("SCAN 9 standby before 3c0+2c3+6c0"));
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 10:
      Serial.println(F("SCAN 10 run profile 3c0+2c3+6c0"));
      sendOne3c0Run();
      mode = MODE_RUN;
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 11:
      Serial.println(F("SCAN 11 DTC profile 3c0+2c3+6c0"));
      printStatus();
      startDtcBurst();
      profileScanStep++;
      profileScanNextMs = millis() + 8500UL;
      return;
    case 12:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.println(F("SCAN 12 standby after 3c0+2c3+6c0"));
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 13:
      profile = PROFILE_FULL_CONTEXT;
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.println(F("SCAN 13 standby before full"));
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 14:
      Serial.println(F("SCAN 14 run profile full"));
      sendOne3c0Run();
      mode = MODE_RUN;
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    case 15:
      Serial.println(F("SCAN 15 DTC profile full"));
      printStatus();
      startDtcBurst();
      profileScanStep++;
      profileScanNextMs = millis() + 8500UL;
      return;
    case 16:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.println(F("SCAN 16 final standby"));
      profileScanStep++;
      profileScanNextMs = millis() + 5000UL;
      return;
    default:
      Serial.println(F("SCAN final status"));
      printStatus();
      mode = MODE_STOP;
      profileScanActive = false;
      suppressPeriodicStatus = true;
      Serial.println(F("SCAN COMPLETE"));
      return;
  }
}

static const __FlashStringHelper *envScanName(byte index) {
  switch (index) {
    case 0:
      return F("gw 5f3");
    case 1:
      return F("gw 6f3");
    case 2:
      return F("gw 5f3+6f3");
    case 3:
      return F("veh 30b+5f2");
    case 4:
      return F("veh 5f5+5f7+65e");
    case 5:
      return F("veh 630+62d+62f");
    case 6:
      return F("veh all");
    default:
      return F("none");
  }
}

static void setEnvScanCandidate(byte index) {
  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;

  switch (index) {
    case 0:
      gatewayCandidate = GW_5F3;
      break;
    case 1:
      gatewayCandidate = GW_6F3;
      break;
    case 2:
      gatewayCandidate = GW_BOTH;
      break;
    case 3:
      vehicleCandidate = VEH_KOMBI_REPEAT;
      break;
    case 4:
      vehicleCandidate = VEH_STATUS_LOW;
      break;
    case 5:
      vehicleCandidate = VEH_DRIVETRAIN;
      break;
    case 6:
      vehicleCandidate = VEH_ALL;
      break;
  }
}

static void startEnvScan() {
  autoTestActive = false;
  profileScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  clearHoldExtras();
  envScanActive = true;
  envScanStep = 0;
  envScanNextMs = millis();
  suppressPeriodicStatus = false;
  Serial.println(F("ENV SCAN START"));
}

static void pollEnvScan(unsigned long now) {
  if (!envScanActive || now < envScanNextMs) {
    return;
  }

  if (envScanStep == 0) {
    Serial.println(F("ENV 0 reset CAN"));
    resetBenchCanState();
    envScanActive = true;
    envScanStep++;
    envScanNextMs = millis() + 3000UL;
    return;
  }

  byte candidate = (envScanStep - 1) / 4;
  byte phase = (envScanStep - 1) % 4;
  if (candidate >= 7) {
    Serial.println(F("ENV final status"));
    printStatus();
    mode = MODE_STOP;
    gatewayCandidate = GW_NONE;
    vehicleCandidate = VEH_NONE;
    envScanActive = false;
    suppressPeriodicStatus = true;
    Serial.println(F("ENV SCAN COMPLETE"));
    return;
  }

  setEnvScanCandidate(candidate);
  switch (phase) {
    case 0:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.print(F("ENV standby before "));
      Serial.println(envScanName(candidate));
      envScanStep++;
      envScanNextMs = millis() + 5000UL;
      return;
    case 1:
      Serial.print(F("ENV run "));
      Serial.println(envScanName(candidate));
      sendOne3c0Run();
      mode = MODE_RUN;
      envScanStep++;
      envScanNextMs = millis() + 5000UL;
      return;
    case 2:
      Serial.print(F("ENV DTC "));
      Serial.println(envScanName(candidate));
      printStatus();
      startDtcBurst();
      envScanStep++;
      envScanNextMs = millis() + 8500UL;
      return;
    default:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.print(F("ENV standby after "));
      Serial.println(envScanName(candidate));
      envScanStep++;
      envScanNextMs = millis() + 5000UL;
      return;
  }
}

static void startCandScan() {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  clearHoldExtras();
  candScanActive = true;
  candScanStep = 0;
  candScanNextMs = millis();
  suppressPeriodicStatus = false;
  Serial.println(F("CAND SCAN START"));
}

static void pollCandScan(unsigned long now) {
  if (!candScanActive || now < candScanNextMs) {
    return;
  }

  if (candScanStep == 0) {
    Serial.println(F("CAND 0 reset CAN"));
    resetBenchCanState();
    candScanActive = true;
    candScanStep++;
    candScanNextMs = millis() + 3000UL;
    return;
  }

  byte candidate = (candScanStep - 1) / 4;
  byte phase = (candScanStep - 1) % 4;
  if (candidate >= 13) {
    Serial.println(F("CAND final status"));
    printStatus();
    mode = MODE_STOP;
    candScanActive = false;
    suppressPeriodicStatus = true;
    Serial.println(F("CAND SCAN COMPLETE"));
    return;
  }

  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;

  switch (phase) {
    case 0:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.print(F("CAND standby before "));
      Serial.println(candScanName(candidate));
      candScanStep++;
      candScanNextMs = millis() + 5000UL;
      return;
    case 1:
      Serial.print(F("CAND run "));
      Serial.println(candScanName(candidate));
      sendOne3c0Run();
      mode = MODE_RUN;
      candScanStep++;
      candScanNextMs = millis() + 5000UL;
      return;
    case 2:
      Serial.print(F("CAND DTC "));
      Serial.println(candScanName(candidate));
      printStatus();
      startDtcBurst();
      candScanStep++;
      candScanNextMs = millis() + 8500UL;
      return;
    default:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.print(F("CAND standby after "));
      Serial.println(candScanName(candidate));
      candScanStep++;
      candScanNextMs = millis() + 5000UL;
      return;
  }
}

static void startCpScan() {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  clearHoldExtras();
  cpScanActive = true;
  cpScanStep = 0;
  cpScanNextMs = millis();
  suppressPeriodicStatus = false;
  Serial.println(F("CP SCAN START"));
}

static void pollCpScan(unsigned long now) {
  if (!cpScanActive || now < cpScanNextMs) {
    return;
  }

  if (cpScanStep == 0) {
    Serial.println(F("CP 0 reset CAN"));
    resetBenchCanState();
    cpScanActive = true;
    cpScanStep++;
    cpScanNextMs = millis() + 3000UL;
    return;
  }

  byte candidate = (cpScanStep - 1) / 4;
  byte phase = (cpScanStep - 1) % 4;
  if (candidate >= 9) {
    Serial.println(F("CP final status"));
    printStatus();
    mode = MODE_STOP;
    cpScanActive = false;
    suppressPeriodicStatus = true;
    Serial.println(F("CP SCAN COMPLETE"));
    return;
  }

  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;

  switch (phase) {
    case 0:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.print(F("CP standby before "));
      Serial.println(cpScanName(candidate));
      cpScanStep++;
      cpScanNextMs = millis() + 5000UL;
      return;
    case 1:
      Serial.print(F("CP run "));
      Serial.println(cpScanName(candidate));
      sendOne3c0Run();
      mode = MODE_RUN;
      cpScanStep++;
      cpScanNextMs = millis() + 5000UL;
      return;
    case 2:
      Serial.print(F("CP DTC "));
      Serial.println(cpScanName(candidate));
      printStatus();
      startDtcBurst();
      cpScanStep++;
      cpScanNextMs = millis() + 8500UL;
      return;
    default:
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      Serial.print(F("CP standby after "));
      Serial.println(cpScanName(candidate));
      cpScanStep++;
      cpScanNextMs = millis() + 5000UL;
      return;
  }
}

static void printRxProbeSummary(const __FlashStringHelper *label) {
  Serial.print(F("--- RX PROBE SUMMARY "));
  Serial.print(label);
  Serial.println(F(" ---"));
  Serial.print(F("unique="));
  Serial.print(rxProbeUsed);
  Serial.print(F(" dropped="));
  Serial.println(rxProbeDropped);

  for (byte i = 0; i < rxProbeUsed; i++) {
    Serial.print(F("RXID "));
    Serial.print(rxProbeIds[i], HEX);
    Serial.print(F(" count="));
    Serial.print(rxProbeCounts[i]);
    Serial.print(F(" last="));
    printHexBytes(rxProbeLens[i], rxProbeData[i]);
    Serial.println();
  }
}

static void startRxProbe() {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  clearHoldExtras();
  rxProbeActive = true;
  rxProbeCollecting = false;
  rxProbeStep = 0;
  rxProbeNextMs = millis();
  suppressPeriodicStatus = false;
  resetRxProbeStats();
  Serial.println(F("RX PROBE START standby/run"));
}

static void printStateProbeLine(const __FlashStringHelper *phase, unsigned long now) {
  Serial.print(F("STATE phase="));
  Serial.print(phase);
  Serial.print(F(" t="));
  Serial.print(now - runStartedMs);

  for (byte i = 0; i < STATE_WATCH_COUNT; i++) {
    Serial.print(F(" id="));
    Serial.print(stateWatchIds[i], HEX);
    Serial.print(F("/"));
    Serial.print(stateWatchCounts[i]);
    Serial.print(F(":"));
    printHexBytes(stateWatchLens[i], stateWatchData[i]);
  }
  Serial.println();
}

static void startStateProbe() {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  holdTestActive = false;
  holdTestMonitoring = false;
  clearHoldExtras();
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = true;
  stateProbeCollecting = false;
  stateProbeStep = 0;
  stateProbeNextMs = millis();
  stateProbePrintIntervalMs = 1000UL;
  suppressPeriodicStatus = false;
  resetStateWatchStats();
  Serial.println(F("STATE PROBE START"));
}

static void pollStateProbe(unsigned long now) {
  if (!stateProbeActive) {
    return;
  }

  if (stateProbeCollecting && now - lastStateProbePrintMs >= stateProbePrintIntervalMs) {
    lastStateProbePrintMs = now;
    printStateProbeLine(isRunMode() ? F("RUN") : F("STANDBY"), now);
  }

  if (now < stateProbeNextMs) {
    return;
  }

  switch (stateProbeStep) {
    case 0:
      Serial.println(F("STATEPROBE 0 reset CAN"));
      resetBenchCanState();
      stateProbeActive = true;
      resetStateWatchStats();
      stateProbeStep++;
      stateProbeNextMs = millis() + 3000UL;
      return;
    case 1:
      profile = PROFILE_3C0_ONLY;
      gatewayCandidate = GW_NONE;
      vehicleCandidate = VEH_NONE;
      testerPresentEnabled = false;
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      resetStateWatchStats();
      runStartedMs = millis();
      lastStateProbePrintMs = 0;
      stateProbePrintIntervalMs = 1000UL;
      stateProbeCollecting = true;
      Serial.println(F("STATEPROBE standby watch 5s"));
      stateProbeStep++;
      stateProbeNextMs = millis() + 5000UL;
      return;
    case 2:
      stateProbeCollecting = false;
      printStateProbeLine(F("STANDBY-END"), now);
      resetStateWatchStats();
      sendOne3c0Run();
      mode = MODE_RUN;
      lastStateProbePrintMs = 0;
      stateProbePrintIntervalMs = 250UL;
      stateProbeCollecting = true;
      Serial.println(F("STATEPROBE run watch first 10s at 250ms"));
      stateProbeStep++;
      stateProbeNextMs = millis() + 10000UL;
      return;
    case 3:
      stateProbePrintIntervalMs = 1000UL;
      Serial.println(F("STATEPROBE run watch 10s more, 1000ms"));
      stateProbeStep++;
      stateProbeNextMs = millis() + 10000UL;
      return;
    default:
      stateProbeCollecting = false;
      printStateProbeLine(F("RUN-END"), now);
      printStatus();
      mode = MODE_STOP;
      stateProbeActive = false;
      suppressPeriodicStatus = true;
      Serial.println(F("STATE PROBE COMPLETE"));
      return;
  }
}

static void pollRxProbe(unsigned long now) {
  if (!rxProbeActive || now < rxProbeNextMs) {
    return;
  }

  switch (rxProbeStep) {
    case 0:
      Serial.println(F("RXPROBE 0 reset CAN"));
      resetBenchCanState();
      rxProbeActive = true;
      resetRxProbeStats();
      rxProbeStep++;
      rxProbeNextMs = millis() + 3000UL;
      return;
    case 1:
      profile = PROFILE_3C0_ONLY;
      gatewayCandidate = GW_NONE;
      vehicleCandidate = VEH_NONE;
      testerPresentEnabled = false;
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      resetRxProbeStats();
      rxProbeCollecting = true;
      Serial.println(F("RXPROBE collecting 10s standby clean"));
      rxProbeStep++;
      rxProbeNextMs = millis() + 10000UL;
      return;
    case 2:
      rxProbeCollecting = false;
      printRxProbeSummary(F("STANDBY"));
      resetRxProbeStats();
      sendOne3c0Run();
      mode = MODE_RUN;
      rxProbeCollecting = true;
      Serial.println(F("RXPROBE collecting 10s after run"));
      rxProbeStep++;
      rxProbeNextMs = millis() + 10000UL;
      return;
    default:
      rxProbeCollecting = false;
      printRxProbeSummary(F("RUN"));
      printStatus();
      mode = MODE_STOP;
      rxProbeActive = false;
      suppressPeriodicStatus = true;
      Serial.println(F("RX PROBE COMPLETE"));
      return;
  }
}

static const __FlashStringHelper *holdTestName(byte index) {
  switch (index) {
    case 0:
      return F("baseline 3c0-only");
    case 1:
      return F("profile full");
    case 2:
      return F("gw 5f3");
    case 3:
      return F("gw 5f3+6f3");
    case 4:
      return F("cand12 high context");
    case 5:
      return F("cp7 5e4high+653high");
    case 6:
      return F("full+gw+veh+cand12+cp7");
    default:
      return F("none");
  }
}

static void clearHoldExtras() {
  holdCandIndex = 255;
  holdCpIndex = 255;
}

static void setHoldCandidate(byte index) {
  profile = PROFILE_3C0_ONLY;
  gatewayCandidate = GW_NONE;
  vehicleCandidate = VEH_NONE;
  clearHoldExtras();

  switch (index) {
    case 1:
      profile = PROFILE_FULL_CONTEXT;
      break;
    case 2:
      gatewayCandidate = GW_5F3;
      break;
    case 3:
      gatewayCandidate = GW_BOTH;
      break;
    case 4:
      holdCandIndex = 12;
      break;
    case 5:
      holdCpIndex = 7;
      break;
    case 6:
      profile = PROFILE_FULL_CONTEXT;
      gatewayCandidate = GW_BOTH;
      vehicleCandidate = VEH_ALL;
      holdCandIndex = 12;
      holdCpIndex = 7;
      break;
  }
}

static void resetHoldObservation() {
  holdTestMonitoring = false;
  holdTestRunWatch = false;
  holdTestSafeSeen = false;
  holdTestSafeAtMs = 0;
  holdStandbyCleanCount = 0;
  holdLast30BLen = 0;
  for (byte i = 0; i < 8; i++) {
    holdLast30B[i] = 0;
  }
}

static void printHoldResult() {
  Serial.print(F("HOLD RESULT candidate="));
  Serial.print(holdTestCandidate);
  Serial.print(F(" name="));
  Serial.print(holdTestName(holdTestCandidate));
  Serial.print(F(" safeAt="));
  if (holdTestSafeSeen) {
    Serial.print(holdTestSafeAtMs);
    Serial.print(F("ms"));
  } else {
    Serial.print(F("none"));
  }
  Serial.print(F(" last30B="));
  printHexBytes(holdLast30BLen, holdLast30B);
  Serial.println();
}

static void startHoldTestRange(byte firstCandidate, byte lastCandidate) {
  autoTestActive = false;
  profileScanActive = false;
  envScanActive = false;
  candScanActive = false;
  cpScanActive = false;
  rxProbeActive = false;
  rxProbeCollecting = false;
  stateProbeActive = false;
  stateProbeCollecting = false;
  dtcBurstActive = false;
  dtcExtBurstActive = false;
  dtcSnapBurstActive = false;
  holdTestActive = true;
  holdTestMonitoring = false;
  holdTestStep = 0;
  holdTestFirstCandidate = firstCandidate;
  holdTestLastCandidate = lastCandidate;
  holdTestCandidate = firstCandidate;
  holdTestNextMs = millis();
  suppressPeriodicStatus = false;
  clearHoldExtras();
  resetHoldObservation();
  Serial.print(F("HOLD TEST START 30B safeAt comparison first="));
  Serial.print(holdTestFirstCandidate);
  Serial.print(F(" last="));
  Serial.println(holdTestLastCandidate);
}

static void startHoldTest() {
  startHoldTestRange(0, 6);
}

static void pollHoldTest(unsigned long now) {
  if (!holdTestActive || now < holdTestNextMs) {
    return;
  }

  if (holdTestStep == 0) {
    Serial.println(F("HOLD 0 reset CAN"));
    resetBenchCanState();
    holdTestActive = true;
    holdTestStep++;
    holdTestNextMs = millis() + 3000UL;
    return;
  }

  holdTestCandidate = holdTestFirstCandidate + ((holdTestStep - 1) / 4);
  byte phase = (holdTestStep - 1) % 4;
  if (holdTestCandidate > holdTestLastCandidate) {
    Serial.println(F("HOLD final status"));
    printStatus();
    mode = MODE_STOP;
    holdTestActive = false;
    holdTestMonitoring = false;
    holdTestRunWatch = false;
    clearHoldExtras();
    suppressPeriodicStatus = true;
    Serial.println(F("HOLD TEST COMPLETE"));
    return;
  }

  switch (phase) {
    case 0:
      profile = PROFILE_3C0_ONLY;
      gatewayCandidate = GW_NONE;
      vehicleCandidate = VEH_NONE;
      clearHoldExtras();
      testerPresentEnabled = false;
      slowTx = true;
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      resetHoldObservation();
      holdTestMonitoring = true;
      holdTestRunWatch = false;
      holdTestStandbyMs = millis();
      Serial.print(F("HOLD standby before "));
      Serial.println(holdTestName(holdTestCandidate));
      holdTestStep++;
      holdTestNextMs = millis() + 5000UL;
      return;
    case 1:
      if (holdStandbyCleanCount < 3 && millis() - holdTestStandbyMs < 20000UL) {
        Serial.print(F("HOLD wait clean standby candidate="));
        Serial.print(holdTestCandidate);
        Serial.print(F(" clean30b="));
        Serial.print(holdStandbyCleanCount);
        Serial.print(F(" last30B="));
        printHexBytes(holdLast30BLen, holdLast30B);
        Serial.println();
        sendOne3c0Standby();
        holdTestNextMs = millis() + 2000UL;
        return;
      }
      if (holdStandbyCleanCount < 3) {
        Serial.print(F("HOLD WARN no clean standby candidate="));
        Serial.print(holdTestCandidate);
        Serial.print(F(" clean30b="));
        Serial.print(holdStandbyCleanCount);
        Serial.print(F(" last30B="));
        printHexBytes(holdLast30BLen, holdLast30B);
        Serial.println();
      }
      setHoldCandidate(holdTestCandidate);
      Serial.print(F("HOLD run "));
      Serial.println(holdTestName(holdTestCandidate));
      resetHoldObservation();
      sendOne3c0Run();
      mode = MODE_RUN;
      holdTestRunMs = millis();
      holdTestMonitoring = true;
      holdTestRunWatch = true;
      holdTestStep++;
      holdTestNextMs = millis() + 12000UL;
      return;
    case 2:
      holdTestMonitoring = false;
      holdTestRunWatch = false;
      printHoldResult();
      printStatus();
      startDtcBurst();
      holdTestStep++;
      holdTestNextMs = millis() + 8500UL;
      return;
    default:
      profile = PROFILE_3C0_ONLY;
      gatewayCandidate = GW_NONE;
      vehicleCandidate = VEH_NONE;
      clearHoldExtras();
      mode = MODE_STANDBY;
      sendOne3c0Standby();
      holdTestRunWatch = false;
      Serial.print(F("HOLD standby after "));
      Serial.println(holdTestName(holdTestCandidate));
      holdTestStep++;
      holdTestNextMs = millis() + 5000UL;
      return;
  }
}

static void handleLine(char *line) {
  while (*line == ' ' || *line == '\t') {
    line++;
  }

  byte lineLen = 0;
  while (line[lineLen] != '\0') {
    lineLen++;
  }
  while (lineLen > 0 && (line[lineLen - 1] == ' ' || line[lineLen - 1] == '\t')) {
    line[--lineLen] = '\0';
  }

  if ((line[0] == 's' || line[0] == 'S') &&
      (line[1] == 't' || line[1] == 'T') &&
      (line[2] == 'a' || line[2] == 'A') &&
      (line[3] == 'r' || line[3] == 'R') &&
      (line[4] == 't' || line[4] == 'T') &&
      line[5] == '\0') {
    startAutoTest();
    return;
  }
  if ((line[0] == 's' || line[0] == 'S') &&
      (line[1] == 'c' || line[1] == 'C') &&
      (line[2] == 'a' || line[2] == 'A') &&
      (line[3] == 'n' || line[3] == 'N') &&
      line[4] == '\0') {
    startProfileScan();
    return;
  }
  if ((line[0] == 'e' || line[0] == 'E') &&
      (line[1] == 'n' || line[1] == 'N') &&
      (line[2] == 'v' || line[2] == 'V') &&
      (line[3] == 's' || line[3] == 'S') &&
      (line[4] == 'c' || line[4] == 'C') &&
      (line[5] == 'a' || line[5] == 'A') &&
      (line[6] == 'n' || line[6] == 'N') &&
      line[7] == '\0') {
    startEnvScan();
    return;
  }
  if ((line[0] == 'c' || line[0] == 'C') &&
      (line[1] == 'a' || line[1] == 'A') &&
      (line[2] == 'n' || line[2] == 'N') &&
      (line[3] == 'd' || line[3] == 'D') &&
      (line[4] == 's' || line[4] == 'S') &&
      (line[5] == 'c' || line[5] == 'C') &&
      (line[6] == 'a' || line[6] == 'A') &&
      (line[7] == 'n' || line[7] == 'N') &&
      line[8] == '\0') {
    startCandScan();
    return;
  }
  if ((line[0] == 'c' || line[0] == 'C') &&
      (line[1] == 'p' || line[1] == 'P') &&
      (line[2] == 's' || line[2] == 'S') &&
      (line[3] == 'c' || line[3] == 'C') &&
      (line[4] == 'a' || line[4] == 'A') &&
      (line[5] == 'n' || line[5] == 'N') &&
      line[6] == '\0') {
    startCpScan();
    return;
  }
  if ((line[0] == 'r' || line[0] == 'R') &&
      (line[1] == 'x' || line[1] == 'X') &&
      (line[2] == 'p' || line[2] == 'P') &&
      (line[3] == 'r' || line[3] == 'R') &&
      (line[4] == 'o' || line[4] == 'O') &&
      (line[5] == 'b' || line[5] == 'B') &&
      (line[6] == 'e' || line[6] == 'E') &&
      line[7] == '\0') {
    startRxProbe();
    return;
  }
  if ((line[0] == 's' || line[0] == 'S') &&
      (line[1] == 't' || line[1] == 'T') &&
      (line[2] == 'a' || line[2] == 'A') &&
      (line[3] == 't' || line[3] == 'T') &&
      (line[4] == 'e' || line[4] == 'E') &&
      (line[5] == 'p' || line[5] == 'P') &&
      (line[6] == 'r' || line[6] == 'R') &&
      (line[7] == 'o' || line[7] == 'O') &&
      (line[8] == 'b' || line[8] == 'B') &&
      (line[9] == 'e' || line[9] == 'E') &&
      line[10] == '\0') {
    startStateProbe();
    return;
  }
  if ((line[0] == 'h' || line[0] == 'H') &&
      (line[1] == 'o' || line[1] == 'O') &&
      (line[2] == 'l' || line[2] == 'L') &&
      (line[3] == 'd' || line[3] == 'D') &&
      (line[4] == 't' || line[4] == 'T') &&
      (line[5] == 'e' || line[5] == 'E') &&
      (line[6] == 's' || line[6] == 'S') &&
      (line[7] == 't' || line[7] == 'T') &&
      line[8] == '\0') {
    startHoldTest();
    return;
  }
  if ((line[0] == 'h' || line[0] == 'H') &&
      (line[1] == 'o' || line[1] == 'O') &&
      (line[2] == 'l' || line[2] == 'L') &&
      (line[3] == 'd' || line[3] == 'D') &&
      line[4] >= '0' && line[4] <= '6' &&
      line[5] == '\0') {
    byte candidate = line[4] - '0';
    startHoldTestRange(candidate, candidate);
    return;
  }
  if ((line[0] == 'd' || line[0] == 'D') &&
      (line[1] == 'o' || line[1] == 'O') &&
      (line[2] == 's' || line[2] == 'S') &&
      (line[3] == 's' || line[3] == 'S') &&
      (line[4] == 'i' || line[4] == 'I') &&
      (line[5] == 'e' || line[5] == 'E') &&
      (line[6] == 'r' || line[6] == 'R') &&
      line[7] == '\0') {
    startAdaptationDossier();
    return;
  }
  if ((line[0] == 'd' || line[0] == 'D') &&
      (line[1] == 'o' || line[1] == 'O') &&
      (line[2] == 's' || line[2] == 'S') &&
      line[3] == '\0') {
    startAdaptationDossier();
    return;
  }
  if ((line[0] == 'd' || line[0] == 'D') &&
      (line[1] == 'i' || line[1] == 'I') &&
      (line[2] == 'd' || line[2] == 'D') &&
      (line[3] == 's' || line[3] == 'S') &&
      (line[4] == 'w' || line[4] == 'W') &&
      (line[5] == 'e' || line[5] == 'E') &&
      (line[6] == 'e' || line[6] == 'E') &&
      (line[7] == 'p' || line[7] == 'P') &&
      line[8] == '\0') {
    startDidSweep();
    return;
  }
  if ((line[0] == 'd' || line[0] == 'D') &&
      (line[1] == 'i' || line[1] == 'I') &&
      (line[2] == 'a' || line[2] == 'A') &&
      (line[3] == 'g' || line[3] == 'G') &&
      (line[4] == 'e' || line[4] == 'E') &&
      (line[5] == 'm' || line[5] == 'M') &&
      (line[6] == 'u' || line[6] == 'U') &&
      line[7] == '3' &&
      line[8] == '\0') {
    startDiagEmu(2);
    return;
  }
  if ((line[0] == 'd' || line[0] == 'D') &&
      (line[1] == 'i' || line[1] == 'I') &&
      (line[2] == 'a' || line[2] == 'A') &&
      (line[3] == 'g' || line[3] == 'G') &&
      (line[4] == 'e' || line[4] == 'E') &&
      (line[5] == 'm' || line[5] == 'M') &&
      (line[6] == 'u' || line[6] == 'U') &&
      line[7] == '2' &&
      line[8] == '\0') {
    startDiagEmu(1);
    return;
  }
  if ((line[0] == 'd' || line[0] == 'D') &&
      (line[1] == 'i' || line[1] == 'I') &&
      (line[2] == 'a' || line[2] == 'A') &&
      (line[3] == 'g' || line[3] == 'G') &&
      (line[4] == 'e' || line[4] == 'E') &&
      (line[5] == 'm' || line[5] == 'M') &&
      (line[6] == 'u' || line[6] == 'U') &&
      line[7] == '\0') {
    startDiagEmu(0);
    return;
  }
  if ((line[0] == 'd' || line[0] == 'D') &&
      (line[1] == 'e' || line[1] == 'E') &&
      (line[2] == 'm' || line[2] == 'M') &&
      (line[3] == 'o' || line[3] == 'O') &&
      line[4] == '\0') {
    startDemoMode();
    return;
  }
  if ((line[0] == 'g' || line[0] == 'G') &&
      (line[1] == 'w' || line[1] == 'W') &&
      (line[2] == 'd' || line[2] == 'D') &&
      (line[3] == 'o' || line[3] == 'O') &&
      (line[4] == 'c' || line[4] == 'C') &&
      line[5] == '\0') {
    startGatewayDocTest();
    return;
  }
  if ((line[0] == 'g' || line[0] == 'G') &&
      (line[1] == 'a' || line[1] == 'A') &&
      (line[2] == 'u' || line[2] == 'U') &&
      (line[3] == 'g' || line[3] == 'G') &&
      (line[4] == 'e' || line[4] == 'E') &&
      (line[5] == 't' || line[5] == 'T') &&
      (line[6] == 'e' || line[6] == 'E') &&
      (line[7] == 's' || line[7] == 'S') &&
      (line[8] == 't' || line[8] == 'T') &&
      line[9] == '\0') {
    startGaugeTest();
    return;
  }
  if (lineLen == 1 && line[0] == 'r') {
    demoModeActive = false;
    demoStandbyPulse = false;
    gaugeTestActive = false;
    dossierActive = false;
    didSweepActive = false;
    diagEmuActive = false;
    gwDocActive = false;
    gwDocRunActive = false;
    mode = MODE_RUN;
    runStartedMs = millis();
    Serial.println(F("MODE run hold: 3C0#0000FFFF"));
    return;
  }
  if (lineLen == 1 && line[0] == 'R') {
    demoModeActive = false;
    demoStandbyPulse = false;
    gaugeTestActive = false;
    dossierActive = false;
    didSweepActive = false;
    diagEmuActive = false;
    gwDocActive = false;
    gwDocRunActive = false;
    startRunPulse();
    return;
  }
  if (lineLen == 1 && (line[0] == 's' || line[0] == 'S')) {
    demoModeActive = false;
    demoStandbyPulse = false;
    gaugeTestActive = false;
    dossierActive = false;
    didSweepActive = false;
    diagEmuActive = false;
    gwDocActive = false;
    gwDocRunActive = false;
    mode = MODE_STANDBY;
    Serial.println(F("MODE standby: 3C0#FFFF0000"));
    return;
  }
  if (lineLen == 1 && (line[0] == 'x' || line[0] == 'X')) {
    suppressPeriodicStatus = false;
    autoTestActive = false;
    profileScanActive = false;
    envScanActive = false;
    candScanActive = false;
    cpScanActive = false;
    rxProbeActive = false;
    rxProbeCollecting = false;
    stateProbeActive = false;
    stateProbeCollecting = false;
    holdTestActive = false;
    holdTestMonitoring = false;
    holdTestRunWatch = false;
    demoModeActive = false;
    demoStandbyPulse = false;
    gaugeTestActive = false;
    dossierActive = false;
    didSweepActive = false;
    diagEmuActive = false;
    gwDocActive = false;
    gwDocRunActive = false;
    clearHoldExtras();
    mode = MODE_STOP;
    Serial.println(F("MODE stop"));
    return;
  }
  if (lineLen == 1 && (line[0] == 'q' || line[0] == 'Q')) {
    suppressPeriodicStatus = false;
    enterQuietListenMode();
    return;
  }
  if (lineLen == 1 && (line[0] == 'n' || line[0] == 'N')) {
    suppressPeriodicStatus = false;
    resetBenchCanState();
    return;
  }
  if (lineLen == 1 && line[0] == 'o') {
    sendOne3c0Standby();
    return;
  }
  if (lineLen == 1 && line[0] == 'O') {
    sendOne3c0Run();
    return;
  }
  if (lineLen == 1 && (line[0] == 'p' || line[0] == 'P')) {
    cycleProfile();
    return;
  }
  if (lineLen == 1 && (line[0] == 'g' || line[0] == 'G')) {
    cycleGatewayCandidate();
    return;
  }
  if (lineLen == 1 && (line[0] == 'v' || line[0] == 'V')) {
    cycleVehicleCandidate();
    return;
  }
  if (lineLen == 1 && (line[0] == 'h' || line[0] == 'H')) {
    enterHealthMode();
    return;
  }
  if (lineLen == 1 && (line[0] == 'm' || line[0] == 'M')) {
    slowTx = !slowTx;
    Serial.println(slowTx ? F("SLOW on") : F("SLOW off"));
    return;
  }
  if (lineLen == 1 && (line[0] == 'i' || line[0] == 'I')) {
    cycleThreeC0Interval();
    return;
  }
  if (lineLen == 1 && (line[0] == 'u' || line[0] == 'U')) {
    testerPresentEnabled = !testerPresentEnabled;
    Serial.println(testerPresentEnabled ? F("TESTER on") : F("TESTER off"));
    return;
  }
  if (lineLen == 1 && (line[0] == 'e' || line[0] == 'E')) {
    extendedSession();
    return;
  }
  if (lineLen == 1 && line[0] == 'd') {
    readDtc(0xFF);
    return;
  }
  if (lineLen == 1 && line[0] == 'D') {
    startDtcBurst();
    return;
  }
  if (lineLen == 1 && (line[0] == 'j' || line[0] == 'J')) {
    readDtcSnapshotIdentification();
    return;
  }
  if (lineLen == 1 && line[0] == 'f') {
    startDtcExtendedBurst();
    return;
  }
  if (lineLen == 1 && line[0] == 'k') {
    startDtcSnapshotBurst();
    return;
  }

  printStatus();
}

static void pollSerial() {
  static char line[24];
  static byte pos = 0;

  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r') {
      continue;
    }
    if (c == '\n') {
      line[pos] = '\0';
      handleLine(line);
      pos = 0;
      continue;
    }
    if (pos < sizeof(line) - 1) {
      line[pos++] = c;
    }
  }
}

void setup() {
  pinMode(CAN_CS_PIN, OUTPUT);
  digitalWrite(CAN_CS_PIN, HIGH);

  Serial.begin(9600);
  delay(1000);

  Serial.println(F("A8 D4 bench system emulator probe"));
  Serial.print(F("Build: "));
  Serial.println(BUILD_TAG);
  Serial.println(F("Default: STOP, no CAN TX until command"));
  Serial.println(F("Commands: gwdoc 5E4+5F3 doc test, diagemu3 DID ping run, diagemu2 quiet diagnostic run, diagemu diagnostic keepalive run, dossier read-only IDs, didsweep F180-F1AF, gaugetest gentle gauges, demo refresh display, start auto test, scan profile test, envscan gw/veh test, candscan Gemini-B test, cpscan CP hypotheses, rxprobe standby/run summary, stateprobe watched state timeline, holdtest all, hold0..hold6 single cold candidate, r run hold, R run pulse, s standby, q quiet, n reset CAN, o/O one 3c0, p profile, g gateway, v vehicle, h health, m slow, i 3c0 interval, d/D DTC, j DTC snap ids, f DTC ext, k DTC snap, e extSession, u tester, x stop, ? status"));
  Serial.println(F("Profiles: 3c0-only -> 3c0+2c3 -> 3c0+2c3+6c0 -> full"));
  Serial.println(F("Gateway candidates: none -> 5f3 -> 6f3 -> 5f3+6f3"));
  Serial.println(F("Vehicle candidates: none -> 30b+5f2 -> 5f5+5f7+65e -> 630+62d+62f -> all"));
  Serial.println(F("MCP2515 8MHz, CAN 500kbps, Serial 9600"));

  while (CAN.begin(MCP_STDEXT, CAN_500KBPS, MCP_8MHZ) != CAN_OK) {
    Serial.println(F("MCP init failed"));
    delay(1000);
  }

  CAN.setMode(MCP_NORMAL);
  Serial.println(F("MCP init OK"));
}

void loop() {
  const unsigned long now = millis();

  pollSerial();
  pollRx();
  pollDtcBurst(now);
  pollDtcDetailBurst(now);
  pollAutoTest(now);
  pollProfileScan(now);
  pollEnvScan(now);
  pollCandScan(now);
  pollCpScan(now);
  pollRxProbe(now);
  pollStateProbe(now);
  pollHoldTest(now);
  pollDemoMode(now);
  pollGaugeTest(now);
  pollAdaptationDossier(now);
  pollDidSweep(now);
  pollDiagEmu(now);
  pollGatewayDocTest(now);

  if (mode == MODE_RUN_PULSE && now - runStartedMs >= RUN_PULSE_MS) {
    mode = MODE_STANDBY;
    Serial.println(F("MODE auto standby: 3C0#FFFF0000"));
  }

  if (now - lastContextMs >= intervalMs(50, 250)) {
    lastContextMs = now;
    sendContextFrames();
  }

  if (now - lastNmMs >= intervalMs(50, 250)) {
    lastNmMs = now;
    sendNmFrame();
  }

  if (now - lastGatewayCandidateMs >= intervalMs(100, 500)) {
    lastGatewayCandidateMs = now;
    sendGatewayCandidateFrames();
  }

  if (gwDocRunActive && now - lastGwDocMs >= 100) {
    lastGwDocMs = now;
    sendGatewayDocFrames();
  }

  if (now - lastVehicleCandidateMs >= intervalMs(100, 500)) {
    lastVehicleCandidateMs = now;
    sendVehicleFrameSet(vehicleCandidate);
  }

  if (candScanActive && now - lastCandScanMs >= 50) {
    lastCandScanMs = now;
    byte candidate = candScanStep == 0 ? 0 : (candScanStep - 1) / 4;
    if (candidate < 13) {
      sendCandScanFrames(candidate);
      rolling++;
    }
  }

  if (cpScanActive && now - lastCpScanMs >= 100) {
    lastCpScanMs = now;
    byte candidate = cpScanStep == 0 ? 0 : (cpScanStep - 1) / 4;
    if (candidate < 9) {
      sendCpScanFrames(candidate);
      rolling++;
    }
  }

  if (holdTestActive && holdCandIndex != 255 && now - lastHoldCandMs >= 50) {
    lastHoldCandMs = now;
    sendCandScanFrames(holdCandIndex);
    rolling++;
  }

  if (holdTestActive && holdCpIndex != 255 && now - lastHoldCpMs >= 100) {
    lastHoldCpMs = now;
    sendCpScanFrames(holdCpIndex);
    rolling++;
  }

  if (now - last3c0Ms >= threeC0IntervalMs()) {
    last3c0Ms = now;
    send3c0Mode();
  }

  if (now - lastAirbagMs >= intervalMs(100, 500)) {
    lastAirbagMs = now;
    sendAirbagFrame();
  }

  if (now - lastTimeMs >= 1000) {
    lastTimeMs = now;
    sendTimeFrame();
  }

  if (now - lastTesterMs >= intervalMs(2000, 5000) && now >= quietTesterUntilMs) {
    lastTesterMs = now;
    sendTesterPresent();
  }

  if (!suppressPeriodicStatus && now - lastStatusMs >= 5000) {
    lastStatusMs = now;
    printStatus();
  }
}
