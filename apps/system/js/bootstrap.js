navigator.mozPower.screenBrightness = 0.9;

// No clue why this is needed but it works.
setTimeout(function() {
  navigator.mozPower.screenEnabled = true;
  navigator.mozPower.screenBrightness = 1;
}, 100);

// We don't have access to sensors when we set screenEnabled to false
// and dont want to flash custom Gecko
window.screen = {
  on: function() {
    navigator.mozPower.screenBrightness = 1;
  },
  off: function() {
    navigator.mozPower.screenBrightness = 0;
  },
  get isOn() {
    return navigator.mozPower.screenBrightness !== 0;
  }
};

// WiFi management
var r = navigator.mozWifiManager.getNetworks();
r.onsuccess = function() { console.log('hi', r); }
