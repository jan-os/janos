'use strict';

/* global BrowserKeyEventManager */

(function(exports) {

  /**
   * After bug 989198 landing, we will be able to listen to KeyboardEvent
   * (e.g. keydown and keyup). Also there will be new events called
   * BeforeAfterKeybaordEvent for mozbrowser-embedder iframe, say system app,
   * to control or override the bahavior of keydown/keyup event in
   * mozbrowser-embedded iframes (other apps or homescreen app).
   * These events are:
   *
   * * mozbrowserbeforekeydown
   * * mozbrowserafterkeydown
   * * mozbrowserbeforekeyup
   * * mozbrowserafterkeyup
   *
   * When a key is pressed down, the event sequence would be:
   * 1. `mozbrowserbeforekeydown` is dispatched to mozbrowser-embedder iframe
   * 2. `keydown` is dispatched to mozbrowser-embedded iframe
   * 3. `mozbrowserkeydown` is dispatched to mozbrowser-embedder iframe
   *
   * For detail, please see
   * https://wiki.mozilla.org/WebAPI/BrowserAPI/KeyboardEvent
   *
   * @example
   * var hardwareButtons = new HardwareButtons();
   * hardwareButtons.start(); // Attach the event listeners.
   * window.addEventListener('sleep-button-press', function(){ console.log('sleep-button-press'); });
   * hardwareButtons.stop();  // Deattach the event listeners.
   *
   * @class    HardwareButtons
   * @requires BrowserKeyEventManager
   **/
  var HardwareButtons = function HardwareButtons() {
    this._started = false;
    this._states = {};
  };

  /**
   * Start listening to events from Gecko and FSM.
   * @memberof HardwareButtons.prototype
   */
  HardwareButtons.prototype.start = function hb_start() {
    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }
    this._started = true;

    // initiate BrowserKeyEventManager submodule
    this.browserKeyEventManager = new BrowserKeyEventManager();

    window.addEventListener('softwareButtonEvent', this);
    window.addEventListener('mozChromeEvent', this);

    // These event handler listens for hardware button events and passes the
    // event type to the process() method of the current state for processing
    window.addEventListener('mozbrowserbeforekeydown', this);
    window.addEventListener('mozbrowserbeforekeyup', this);
    window.addEventListener('mozbrowserafterkeydown', this);
    window.addEventListener('mozbrowserafterkeyup', this);
    window.addEventListener('keydown', this);
    window.addEventListener('keyup', this);
  };

  /**
   * Stop listening to events. Must call before throwing away the instance
   * to avoid memory leaks.
   * @memberof HardwareButtons.prototype
   */
  HardwareButtons.prototype.stop = function hb_stop() {
    if (!this._started) {
      throw 'Instance was never start()\'ed but stop() is called.';
    }
    this._started = false;

    window.removeEventListener('softwareButtonEvent', this);
    window.removeEventListener('mozChromeEvent', this);

    window.removeEventListener('mozbrowserbeforekeydown', this);
    window.removeEventListener('mozbrowserbeforekeyup', this);
    window.removeEventListener('mozbrowserafterkeydown', this);
    window.removeEventListener('mozbrowserafterkeyup', this);
    window.removeEventListener('keydown', this);
    window.removeEventListener('keyup', this);
  };

  /**
   * Handle events from Gecko.
   * @memberof HardwareButtons.prototype
   * @param  {Object} evt Event.
   */
  HardwareButtons.prototype.handleEvent = function hb_handleEvent(evt) {
    // When the software home button is displayed we ignore the hardware
    // home button if there is one
    var hardwareHomeEvent =
      (this.browserKeyEventManager.isHardwareKeyEvent(evt.type)) &&
      this.browserKeyEventManager.isHomeKey(evt);
    
    var type;

    if (evt.type === 'softwareButtonEvent' || evt.type === 'mozChromeEvent') {
      type = evt.detail.type;
    } else {
      type = this.browserKeyEventManager.getButtonEventType(evt);
    }
    
    switch (type) {
      case 'home-button-press':
      case 'home-button-release':
      case 'sleep-button-press':
      case 'sleep-button-release':
      case 'volume-up-button-press':
      case 'volume-up-button-release':
      case 'volume-down-button-press':
      case 'volume-down-button-release':

        if(type.match(/press$/)){
          this._states[type.replace(/press$/, 'release')] = false;
        } else {
          this._states[type.replace(/release$/, 'press')] = false;
        }
        
        // Debouncing all hardware buttons
        if(this._states[type]){
          return;
        }

        this._states[type] = true;

        window.dispatchEvent(new CustomEvent(type));
        break;
    }
  };

  exports.HardwareButtons = HardwareButtons;
}(window));
