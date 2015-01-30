window.addEventListener('ready', () => {
  var motionEv = ev => {
    console.log('z-axis', ev.accelerationIncludingGravity.z);
  };

  window.devicemotion = {
    start: () => {
      window.addEventListener('devicemotion', motionEv);
    },
    stop: () => {
      window.removeEventListener('devicemotion', motionEv);
    }
  };

  console.log('Devicemotion ready');
});
