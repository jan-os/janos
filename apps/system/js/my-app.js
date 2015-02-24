/**
 * A simple Firefox OS Script to deal with GPIO
 */
window.addEventListener('ready', () => {

  // First we map our pins to be input / output pins
  // We don't support pullup/pulldown, you need to do that with hardware
  Promise.all([
    navigator.gpio.setPinMode(2, 'output'),
    navigator.gpio.setPinMode(3, 'output'),
    navigator.gpio.setPinMode(26, 'input')
  ]).then(pins => {

    // Here you have a reference to your pins again
    // You can also use navigator.gpio.getPin(ID)
    let [ pin2, pin3, pin26 ] = pins;

    // Example 1: Blink a LED every 500 ms. (after pressing the button)
    let blinkTimeout;
    let blinkValue = 0;

    function blink() {
      blinkValue ^= 1;
      pin2.writeDigital(blinkValue);
      
      blinkTimeout = setTimeout(blink, Number(document.querySelector('#speed').value));
    }

    document.querySelector('.blink').onclick = () => {
      if (blinkTimeout) {
        return clearTimeout(blinkTimeout);
      }
      blink();
    };

    document.querySelector('#speed').oninput = e => {
      document.querySelector('label[for=speed]').textContent = e.target.value;
    };

    // Example 2: Turn on a LED when button is pressed
    // This happens in a loop as there is no hardware interrupts (yet?)
    setInterval(() => {

      // Read it, then pass the value on to pin3
      pin26.readDigital().then(v => pin3.writeDigital(v))
        .catch(err => console.error(err));

    }, 50);

  });

});
