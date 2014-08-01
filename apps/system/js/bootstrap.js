navigator.mozPower.screenBrightness = 0.9;

// No clue why this is needed but it works.
setTimeout(function() {
  navigator.mozPower.screenBrightness = 1;
  navigator.mozPower.screenEnabled = true;
}, 100);
