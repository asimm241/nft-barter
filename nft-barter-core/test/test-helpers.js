const { assert } = require("chai");

const ERROR_INVALID_TOKEN_ID = "1000: invalid token id";
const ERROR_INVALID_SWAP = "1002: invalid swap";
const ERROR_PERMISSION_DENIED = "1001: permission denied";

const EVENT_SWAP_INITIATED = "SwapInitiated";
const EVENT_SWAP_UPDATED = "SwapUpdate";
const EVENT_SWAP_CANCELED = "SwapCanceled";

function checkDataFromEvent(event, structName, expected, eventType) {
  const typeOfEvent = event.logs[0].event;
  assert.equal(typeOfEvent, eventType);
  const dataArr = event.receipt.logs[0].args[structName];
  const expectedKeys = Object.keys(expected);

  expectedKeys.forEach((key) => {
    assert.equal(dataArr[key], expected[key].toString());
  });
}

module.exports = {
  checkDataFromEvent,
  ERROR_PERMISSION_DENIED,
  ERROR_INVALID_SWAP,
  ERROR_INVALID_TOKEN_ID,
  EVENT_SWAP_INITIATED,
  EVENT_SWAP_UPDATED,
  EVENT_SWAP_CANCELED
};
