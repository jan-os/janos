window.doorbell = {
  start: function() {
    window.addEventListener('userproximity', this.proximity);
  },

  proximity: function(e) {
    if (e.near) {
      var audio = new Audio('/sounds/doorbell.ogg');
      audio.mozAudioChannelType = 'content';
      audio.play();
      
      navigator.vibrate(200);
    }
  },

  stop: function() {
    window.removeEventListener('userproximity', this.proximity);
  }
};
