function _write(value, path) {
  return navigator.mozOs.openFile(path, 'wb').then(file => {
    return Promise.resolve()
      .then(() => file.write(value, 'utf-8'))
      .then(() => file.close());
  });
}

function _read(path, bytes) {
  return navigator.mozOs.openFile(path).then(file => {
    var data;
    return Promise.resolve()
      // @todo, its not utf-8 i think
      .then(() => file.read(bytes || Number.Infinity, 'utf-8'))
      .then(aData => data = aData)
      .then(() => file.close())
      .then(() => data);
  });
}

navigator.gpio = {
  _pins: {},
  
  getPin: function(id) {
    return this._pins[id];
  },

  setPinMode: function(id, mode) {
    var direction;
    switch (mode) {
      case 'in':
      case 'input':
        direction = 'in';
        break;
      case 'out':
      case 'output':
        direction = 'out';
        break;
      default:
        throw 'mode should be in|out';
    }
    
    var promise = 
      _write(id, '/sys/class/gpio/export')
        .then(() => _write(direction, '/sys/class/gpio/gpio' + id + '/direction'))
        .then(() => {
          var fm = direction === 'out' ? 'wb' : 'rb';
          return navigator.mozOs.openFile('/sys/class/gpio/gpio' + id + '/value', fm);
        })
        .then(fd => {
          console.log('hi there', id, fd);
          this._pins[id] = new GpioPin(id, mode, direction, fd);
          return this._pins[id];
        })
        .catch(err => {
          console.error('Exporting gpio pin', id, 'failed', err);
          throw err;
        });
        
    return promise;
  }
};

function GpioPin(id, mode, direction, fd) {
  this.id = id;
  this.mode = mode;
  this.direction = direction;
  this.fd = fd;
}

GpioPin.prototype.addEventListener = function() {
  throw 'NotImplemented';
};
GpioPin.prototype.removeEventListener = function() {
  throw 'NotImplemented';
};
GpioPin.prototype.writeDigital = function(value) {
  value = value ? 1 : 0;

  return Promise.resolve()
    .then(() => this.fd.setPosition(0, 'POS_START'))
    .then(() => this.fd.write(value, 'utf-8'))
    .catch(err => {
      this._lastValue = null;
      console.error('Gpio', this.id, 'writeDigital failed', err);
      throw err;
    });
};
GpioPin.prototype.writeAnalog = function() {
  throw 'NotImplemented';
};
GpioPin.prototype.readDigital = function() {
  return Promise.resolve()
    .then(() => this.fd.setPosition(0, 'POS_START'))
    .then(() => this.fd.read(1, 'utf-8'))
    .then(res => res[0] === '1' ? true : false);
};
GpioPin.prototype.readAnalog = function() {
  throw 'NotImplemented';
};
GpioPin.prototype.release = function() {
  return this.fd.close();
};
