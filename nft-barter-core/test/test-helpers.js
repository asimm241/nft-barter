const { assert } = require("chai");

const ERROR_INVALID_TOKEN_ID = "1000: invalid token id";
const ERROR_INVALID_SWAP = "1002: invalid swap";
const ERROR_PERMISSION_DENIED = "1001: permission denied";
const INVALID_BALANCE_TRANSFERRED = "1004: invalid balance transferred";
const ERROR_SWAP_NOT_PENDING = "1008: swap not pending";

const EVENT_SWAP_INITIATED = "SwapInitiated";
const EVENT_SWAP_UPDATED = "SwapUpdate";
const EVENT_SWAP_CANCELED = "SwapCanceled";
const EVENT_SWAP_ACCEPTED = "SwapAccepted";

function checkObjectInArray(dataArr, expected) {
  const expectedKeys = Object.keys(expected);
  expectedKeys.forEach((key) => {
    assert.equal(dataArr[key], expected[key].toString());
  });
}

function checkDataFromEvent(event, structName, expected, eventType) {
  //   const typeOfEvent = event.logs[0].event;
  const logsIndex = event.logs.findIndex((log) => log.event === eventType);
  assert.isTrue(logsIndex > -1);
  const dataArr = event.receipt.logs[logsIndex].args[structName];
  checkObjectInArray(dataArr, expected);
}

module.exports = {
  checkDataFromEvent,
  checkObjectInArray,
  ERROR_PERMISSION_DENIED,
  ERROR_INVALID_SWAP,
  ERROR_INVALID_TOKEN_ID,
  ERROR_SWAP_NOT_PENDING,
  INVALID_BALANCE_TRANSFERRED,
  EVENT_SWAP_INITIATED,
  EVENT_SWAP_UPDATED,
  EVENT_SWAP_CANCELED,
  EVENT_SWAP_ACCEPTED,
};
