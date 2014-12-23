console.log('here');

var hardwareButtons = new HardwareButtons();

hardwareButtons.start(); // Attach the event listeners

window.addEventListener('sleep-button-press', function () {
  console.log('sleep-button-press');
});

window.addEventListener('sleep-button-release', function () {
  console.log('sleep-button-release');
});

window.addEventListener('volume-up-button-press', function () {
  console.log('volume-up-button-press');
});

window.addEventListener('volume-up-button-release', function () {
  console.log('volume-up-button-release');
});

window.addEventListener('volume-down-button-press', function () {
  console.log('volume-down-button-press');
});

window.addEventListener('volume-down-button-release', function () {
  console.log('volume-down-button-release');
});

navigator.mozPower.screenEnabled = true; // Home button works only if screen is enabled

window.addEventListener('home-button-press', function () {
  console.log('home-button-press');
});

window.addEventListener('home-button-release', function () {
  console.log('home-button-release');
});