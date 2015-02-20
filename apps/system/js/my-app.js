var gpio = navigator.gpio;

Promise.all([
  gpio.setPinMode(2, 'output'),
  gpio.setPinMode(3, 'output')
]).then(pins => {
  
  let [ pin2, pin3 ] = pins;
  
  var value = 0;
  function go() {
    value ^= 1;
    
    Promise.all([
      pin2.writeDigital(value),
      pin3.writeDigital(value ^ 1)
    ]).then(go, err => console.error('Write failed', err));
  }
  go();
  
});
