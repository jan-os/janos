navigator.gpio = {
  _pins: {},

  getPin: function(id) {
    return this._pins[id];
  },

  setPinMode: function(id, mode) {
    var self = this;
    
    var direction;
    switch (mode) {
      case 'output':
        direction = 'out';
        break;
      default:
        throw 'Only support output';
    }
    
    return new Promise((res, rej) => {
      navigator.mozOs.exec('echo ' + id + ' > /sys/class/gpio/export')
        .then(() => navigator.mozOs.exec('echo ' + direction + ' > /sys/class/gpio/gpio' + id + '/direction'))
        .then(obj => {
          if (obj.exitCode === 0) {
            self._pins[id] = new GpioPin(id, mode, direction);
            res(self._pins[id]);
          }
          else {
            console.error('Writing gpio failed', obj);
            rej('exitCode is ' + obj.exitCode);
          }
        }, rej);
    });
  }
};

function GpioPin(id, mode, direction) {
  this.id = id;
  this.mode = mode;
  this.direction = direction;
  this.path = '/sys/class/gpio/gpio' + id + '';
}

GpioPin.prototype.addEventListener = function() {
  throw 'NotImplemented';
};
GpioPin.prototype.removeEventListener = function() {
  throw 'NotImplemented';
};
GpioPin.prototype.writeDigital = function(value) {
  value = value ? '1' : '0';
  
  // console.log('executing', 'echo ' + value + ' > ' + this.path + '/value');
  
  return navigator.mozOs.exec('echo ' + value + ' > ' + this.path + '/value')
    .then(obj => {
      // console.log('response is', obj);
      if (obj.exitCode === 0) {
        return true;
      }
      else {
        console.error('writeDigital failed', obj);
        throw 'exitCode is not 0 ' + obj.exitCode;
      }
    }).catch(err => console.log('err', err));
};
GpioPin.prototype.writeAnalog = function() {
  throw 'NotImplemented';
};
GpioPin.prototype.readDigital = function() {
  throw 'NotImplemented';
};
GpioPin.prototype.readAnalog = function() {
  throw 'NotImplemented';
};
