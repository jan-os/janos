navigator.mozPower.screenBrightness = 0.9;

// No clue why this is needed but it works.
setTimeout(function() {
  navigator.mozPower.screenEnabled = true;
  navigator.mozPower.screenBrightness = 1;
}, 100);

// We don't have access to sensors when we set screenEnabled to false
// and dont want to flash custom Gecko
window.screen = {
  on: function() {
    navigator.mozPower.screenBrightness = 1;
  },
  off: function() {
    navigator.mozPower.screenBrightness = 0;
  },
  get isOn() {
    return navigator.mozPower.screenBrightness !== 0;
  }
};

// For every SIM card enable radio
[].forEach.call(navigator.mozMobileConnections, function(conn, ix) {
  var sre = conn.setRadioEnabled(true);
  sre.onsuccess = function() {
    dump('setRadioEnabled for SIM ' + ix + ' succeeded\n');
  };
  sre.onerror = function(e) {
    dump('setRadioEnabled for SIM ' + ix + ' failed ' + sre.error + '\n');
  };
});

// Enable data
var dataReq = navigator.mozSettings.createLock().set({ 'ril.data.enabled': true })
dataReq.onerror = function() {
  dump('Failed to enable data ' + dataReq.error + '\n');
};

// Connect to Wifi
(function() {
  function connect(network, pass) {
    var n = navigator.mozWifiManager.getNetworks();
    n.onsuccess = function() {
      var wifi = n.result.filter(function(w) { return w.ssid === network })[0];
      if (!wifi) {
        return console.error('Could not find wifi network "' + network + '"');
      }

      wifi.password = pass;
      var req = navigator.mozWifiManager.associate(wifi);
      req.onsuccess = function() {
        console.log('Wifi connected');
      };
      req.onerror = function() {
        console.error('Wifi connection failed', req.error);
      };
    };
    n.onerror = function(e) {
      console.error('GetNetworks failed', e);
    };
  }

  var x = new XMLHttpRequest();
  x.onload = function() {
    if (x.status !== 200) {
      return console.error('Could not fetch js/wifi_credentials.json', x.status);
    }

    var c = x.response;
    connect(c.network, c.password);
  };
  x.onerror = function() {
    return console.error('Could not fetch js/wifi_credentials.json', x.error);
  };

  x.open('GET', '/js/wifi_credentials.json');
  x.responseType = 'json';
  try {
    x.send();
  }
  catch (ex) {
    console.error('Could not find js/wifi_credentials.json', ex);
  }
})();
