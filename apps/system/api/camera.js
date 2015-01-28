window.camera = {
  _camera: null,
  _cameraId: null,

  _getCamera: function(id) {
    var self = this;

    var releaseIfNeeded = function() {
      return new Promise(function(res, rej) {
        if (self._cameraId === null || id === self._cameraId) {
          return res();
        }

        return self.releaseCamera();
      });
    };

    return releaseIfNeeded().then(function() {
      return new Promise(function(done, error) {
        if (self._camera) {
          return done(self._camera);
        }

        var cameraApi = navigator.mozCameras || navigator.mozCamera;

        if (!cameraApi) {
          return error('Cannot get access to the camera API');
        }

        if (cameraApi.getListOfCameras().indexOf(id) === -1) {
          return error('No back camera found on your device');
        }

        var options = {
          mode: 'picture',
          previewSize: {
            width: 640,
            height: 480
          }
        };
        var onsuccess = function(c) {
          self._camera = c;
          self._cameraId = id;
          done(c);
        };
        var onerror = function(err) {
          console.error(err);
          error('Could not get the camera. Is another application using the camera?');
        };

        var cameraReq = cameraApi.getCamera(id, options, onsuccess, onerror);
        if (cameraReq && cameraReq.then) {
          cameraReq.then(params => {
            onsuccess(params.camera);
          }, onerror);
        }
      });
    });
  },

  _getFlash: function() {
    return this._getCamera('back').then(function(c) {
      var f = c.capabilities.flashModes;
      if (!f || !f.length) {
        throw 'No flash found on your device';
      }
      if (f.indexOf('torch') === -1) {
        throw 'Flash does not support torch mode';
      }
      return c;
    });
  },

  toggleFlash: function(enabled) {
    return this._getFlash().then(function(c) {
      c.flashMode = enabled ? 'torch' : 'off';
    });
  },

  releaseCamera: function() {
    return new Promise(function(res, rej) {
      if (!this._camera) {
        return rej('No camera attached');
      }

      this._camera.flashMode = 'off';
      this._camera.release();
      this._camera = null;
      this._cameraId = null;
      res();
    }.bind(this));
  },

  _tpTimeout: null,

  takePicture: function(cameraId) {
    var self = this;
    var picture;
    return this._getCamera(cameraId).then(function(c) {
      return new Promise(function(res, rej) {
        // @todo, format raw, what is that? Should avoid recompression.
        var options = {
          dateTime: Date.now() / 1000 | 0,
          fileFormat: 'jpeg',
          position: null,
          orientation: 0 // @todo
        };

        // @todo: if we have 5 in a row or so something is fucked up
        // need to force a reboot
        self._tpTimeout = setTimeout(() => {
          console.warn('Taking picture timed out');
          rej('Taking picture timed out');
        }, 5000);

        // @todo: autofocus if supported
        c.pictureQuality = 1.0; // we compress later
        if ('setPictureSize' in c) {
          c.setPictureSize({ width: 640, height: 480 });
        }

        var onsuccess = function(aBlob) {
          picture = { blob: aBlob, sensorAngle: c.sensorAngle };
          res(picture);
        };
        var onerror = function(err) {
          rej(err);
        };

        var tpReq = c.takePicture(options, onsuccess, onerror);
        if (tpReq && tpReq.then) {
          tpReq.then(onsuccess, onerror);
        }
      });
    })
    .then(this.releaseCamera.bind(this))
    .then(function() {
      clearTimeout(self._tpTimeout);
      return picture;
    }).catch(err => {
      self.releaseCamera();
      return Promise.reject(err); // ? is this correct way of doing it?
    });
  },

  getAllCameras: function() {
    var cameraApi = navigator.mozCameras || navigator.mozCamera;
    return cameraApi.getListOfCameras();
  }
};
