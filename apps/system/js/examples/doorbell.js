window.addEventListener('ready', () => {
  window.doorbell = {
    _bt: null,
    _audio: new Audio('/sounds/doorbell.ogg'),

    start: function(address) {
      this._bt = window.enableBluetoothAudio(address);
      return this._bt.then(function() {
        // @todo: handle bluetooth disconnect

        window.addEventListener('userproximity', this.proximity.bind(this));

        console.log('[Doorbell] Ready!');
      }.bind(this));
    },

    proximity: function(e) {
      if (e.near) {
        this._audio.loop = true;
        this._audio.play();

        navigator.vibrate(200);
      }
      else {
        this._audio.pause();
      }
    },

    stop: function() {
      this._bt = null;

      window.removeEventListener('userproximity', this.proximity);
    }
  };
  
  console.log('Doorbell ready');
});
