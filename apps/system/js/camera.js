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

        cameraApi.getCamera(id, {
          mode: 'picture',
          recorderProfile: 'jpg',
          previewSize: {
            width: 352,
            height: 288
          }
        }, function(c) {
          self._camera = c;
          self._cameraId = id;
          done(c);
        }, function() {
          error('Could not get the camera. Is another application using the camera?');
        });
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

  takePicture: function(cameraId) {
    var blob;
    return this._getCamera(cameraId).then(function(c) {
      return new Promise(function(res, rej) {
        c.takePicture({}, function(aBlob) {
          blob = aBlob;
          res();
        }, rej);
      });
    })
    .then(this.releaseCamera.bind(this))
    .then(function() {
      return blob;
    });
  },
  
  getAllCameras: function() {
    var cameraApi = navigator.mozCameras || navigator.mozCamera;
    return cameraApi.getListOfCameras();
  }
};
