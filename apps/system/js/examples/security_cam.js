window.addEventListener('ready', () => {
  window.securityCam = {
    _timeout: null,

    start: function(camera, iv) {
      var self = this;
      this._takePicture(camera || 'back', function() {
        self._timeout = setTimeout(function() {
          self.start(camera, iv);
        }, iv || 30000);
      });
    },

    _takePicture: function(cameraId, cb) {
      var storage = navigator.getDeviceStorage('pictures');

      window.camera.takePicture(cameraId).then(function(ev) {
        var blob = ev.blob;
        console.log('Took picture', cameraId, blob);
        var filename = 'security/' + cameraId + '_' + (new Date().toISOString().slice(0, 19)).replace(/:/g, '') + '.jpg';
        var req = storage.addNamed(blob, filename);
        req.onsuccess = cb;
        req.onerror = function() {
          console.error('Could not save', req.error);
          cb && cb();
        };
      }, function(err) {
        console.error('Took picture failed', cameraId, err);
        cb && cb();
      });
    },

    stop: function() {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
    }
  };

  console.log('Security Cam ready');
});
