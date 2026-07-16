/*
  Audi A8 D4 / 4H 0x3C0 virtual-key pattern matrix

  Hardware:
  - Arduino Nano
  - MCP2515 CAN module with 8 MHz crystal
  - Library: "MCP_CAN_lib" by Cory J. Fowler

  Serial: 9600 baud

  Verified bench base:
  - 0x6C0#0100FF<counter>00000000 turns on and holds backlighting.
  - 0x2C3#070000<counter>00000000 is a plausible cluster wake/status keepalive.

  Recalled/researched clue:
  - 0x3C0 byte patterns like 00 00 FF FF change with virtual key position.
*/

#include <SPI.h>
#include <mcp_can.h>

static const byte CAN_CS_PIN = 10;

MCP_CAN CAN(CAN_CS_PIN);

struct TestCase {
  bool send2c3;
  bool send271;
  byte value271;
  byte len3c0;
  byte data3c0[8];
  const char *name;
};

static const TestCase TESTS[] = {
  {true, false, 0x00, 0, {0, 0, 0, 0, 0, 0, 0, 0}, "baseline 6C0+2C3"},
  {true, false, 0x00, 4, {0x00, 0x00, 0xFF, 0xFF, 0, 0, 0, 0}, "3C0 dlc4 0000FFFF"},
  {true, false, 0x00, 4, {0xFF, 0xFF, 0x00, 0x00, 0, 0, 0, 0}, "3C0 dlc4 FFFF0000"},
  {true, false, 0x00, 4, {0x00, 0xFF, 0x00, 0xFF, 0, 0, 0, 0}, "3C0 dlc4 00FF00FF"},
  {true, false, 0x00, 4, {0xFF, 0x00, 0xFF, 0x00, 0, 0, 0, 0}, "3C0 dlc4 FF00FF00"},
  {true, false, 0x00, 8, {0x00, 0x00, 0xFF, 0xFF, 0, 0, 0, 0}, "3C0 dlc8 0000FFFF00000000"},
  {true, false, 0x00, 8, {0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0, 0}, "3C0 dlc8 0000FFFFFFFF0000"},
  {true, true, 0x07, 4, {0x00, 0x00, 0xFF, 0xFF, 0, 0, 0, 0}, "3C0 0000FFFF + 271#07"},
  {true, true, 0x87, 4, {0x00, 0x00, 0xFF, 0xFF, 0, 0, 0, 0}, "3C0 0000FFFF + 271#87"},
  {false, false, 0x00, 4, {0x00, 0x00, 0xFF, 0xFF, 0, 0, 0, 0}, "6C0 + 3C0 only, no 2C3"},
  {true, false, 0x00, 4, {0x00, 0x00, 0x00, 0x00, 0, 0, 0, 0}, "3C0 dlc4 all zero"},
  {true, false, 0x00, 4, {0xFF, 0xFF, 0xFF, 0xFF, 0, 0, 0, 0}, "3C0 dlc4 all FF"}
};

static const unsigned long TEST_WINDOW_MS = 12000UL;

static unsigned long startedMs = 0;
static unsigned long lastBaseMs = 0;
static unsigned long last3c0Ms = 0;
static unsigned long last271Ms = 0;
static unsigned long lastStatusMs = 0;
static byte lastTestIndex = 255;
static byte rolling = 0;
static unsigned long rxCount = 0;
static unsigned long txOk = 0;
static unsigned long txFail = 0;

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

static byte testIndex() {
  return ((millis() - startedMs) / TEST_WINDOW_MS) % (sizeof(TESTS) / sizeof(TESTS[0]));
}

static void sendFrame(unsigned long id, const byte *data, byte len) {
  byte result = CAN.sendMsgBuf(id, 0, len, (byte *)data);
  result == CAN_OK ? txOk++ : txFail++;
}

static void pollRx() {
  byte drained = 0;
  while (CAN.checkReceive() == CAN_MSGAVAIL && drained < 24) {
    unsigned long id = 0;
    byte len = 0;
    byte data[8] = {0};
    CAN.readMsgBuf(&id, &len, data);
    rxCount++;
    drained++;
  }
}

static void sendBaseFrames() {
  const TestCase &test = TESTS[testIndex()];

  byte light6c0[8] = {0x01, 0x00, 0xFF, rolling, 0x00, 0x00, 0x00, 0x00};
  sendFrame(0x6C0, light6c0, 8);

  if (test.send2c3) {
    byte wake2c3[8] = {0x07, 0x00, 0x00, rolling, 0x00, 0x00, 0x00, 0x00};
    sendFrame(0x2C3, wake2c3, 8);
  }

  rolling++;
}

static void sendCurrent3c0() {
  const TestCase &test = TESTS[testIndex()];
  if (test.len3c0 == 0) {
    return;
  }

  byte data[8];
  for (byte i = 0; i < 8; i++) {
    data[i] = test.data3c0[i];
  }

  sendFrame(0x3C0, data, test.len3c0);
}

static void sendCurrent271() {
  const TestCase &test = TESTS[testIndex()];
  if (!test.send271) {
    return;
  }

  byte data[1] = {test.value271};
  sendFrame(0x271, data, 1);
}

static void printTestIfChanged() {
  const byte index = testIndex();
  if (index == lastTestIndex) {
    return;
  }

  lastTestIndex = index;
  Serial.print(F("TEST "));
  Serial.print(index);
  Serial.print(F("/"));
  Serial.print((sizeof(TESTS) / sizeof(TESTS[0])) - 1);
  Serial.print(F(" "));
  Serial.println(TESTS[index].name);
}

static void printStatus() {
  const byte eflg = readRegister(0x2D);
  const byte tec = readRegister(0x1C);
  const byte rec = readRegister(0x1D);
  const byte canintf = readRegister(0x2C);

  Serial.print(F("STATUS 3c0Test="));
  Serial.print(testIndex());
  Serial.print(F(" rx="));
  Serial.print(rxCount);
  Serial.print(F(" txOk="));
  Serial.print(txOk);
  Serial.print(F(" txFail="));
  Serial.print(txFail);
  Serial.print(F(" EFLG=0x"));
  printHex2(eflg);
  Serial.print(F(" TEC="));
  Serial.print(tec);
  Serial.print(F(" REC="));
  Serial.print(rec);
  Serial.print(F(" CANINTF=0x"));
  printHex2(canintf);
  Serial.println();
}

void setup() {
  pinMode(CAN_CS_PIN, OUTPUT);
  digitalWrite(CAN_CS_PIN, HIGH);

  Serial.begin(9600);
  delay(1000);

  Serial.println(F("A8 D4 0x3C0 virtual-key matrix"));
  Serial.println(F("0x6C0 backlight is always active"));
  Serial.println(F("MCP2515 8MHz, CAN 500kbps, Serial 9600"));
  Serial.println(F("Watch cluster at each TEST line; full cycle is about 2.4 minutes."));

  while (CAN.begin(MCP_STDEXT, CAN_500KBPS, MCP_8MHZ) != CAN_OK) {
    Serial.println(F("MCP init failed"));
    delay(1000);
  }

  CAN.setMode(MCP_NORMAL);
  startedMs = millis();
  Serial.println(F("MCP init OK"));
}

void loop() {
  const unsigned long now = millis();

  pollRx();
  printTestIfChanged();

  if (now - lastBaseMs >= 50) {
    lastBaseMs = now;
    sendBaseFrames();
  }

  if (now - last3c0Ms >= 100) {
    last3c0Ms = now;
    sendCurrent3c0();
  }

  if (now - last271Ms >= 100) {
    last271Ms = now;
    sendCurrent271();
  }

  if (now - lastStatusMs >= 1000) {
    lastStatusMs = now;
    printStatus();
  }
}
