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

    store: function(name, blob) {
      if ('mozOs' in navigator) {
        var os = navigator.mozOs;

        return new Promise(function(res, rej) {
          var fr = new FileReader();
          fr.onload = () => {
            os.createDirectory('/data/local/security', true)
              .then(() => {
                os.writeFile('/data/local/security/' + name, new Uint8Array(fr.result))
                  .then(res, rej);
              }, rej);
          };
          fr.readAsArrayBuffer(blob);
        });
      }
      else {
        name = 'security/' + name;
        return new Promise(function(res, rej) {
          var req = storage.addNamed(blob, filename);
          req.onsuccess = res;
          req.onerror = rej;
        });
      }
    },

    _takePicture: function(cameraId, cb) {
      var self = this;
      var storage = navigator.getDeviceStorage('pictures');

      window.camera.takePicture(cameraId).then(function(ev) {
        var blob = ev.blob;
        var filename = cameraId + '_' + (new Date().toISOString().slice(0, 19)).replace(/:/g, '') + '.jpg';

        self.store(filename, blob)
          .then(function() {
            console.log('Took picture', cameraId, blob.size);
          })
          .catch(function(err) {
            console.error('Saving picture failed', err);
          })
          .then(cb);
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
