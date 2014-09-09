// No clue why this is needed but it works.
navigator.mozPower.screenBrightness = 0.9;

window.addEventListener('load', function() {
  navigator.mozPower.screenEnabled = true;
  navigator.mozPower.screenBrightness = 1;

  // Gecko can send us system messages!
  var evt = new CustomEvent('mozContentEvent',
      { bubbles: true, cancelable: false,
        detail: { type: 'system-message-listener-ready' } });
  window.dispatchEvent(evt);

  // Load config file
  var x = new XMLHttpRequest();
  x.onload = function() {
    if (x.status !== 200) {
      return console.error('Could not fetch js/local_settings.json', x.status);
    }

    var c = x.response;
    go(c);
  };
  x.onerror = function() {
    return console.error('Could not fetch js/local_settings.json', x.error);
    go(null);
  };

  x.open('GET', '/js/local_settings.json');
  x.responseType = 'json';
  try {
    x.send();
  }
  catch (ex) {
    console.error('Could not find js/local_settings.json', ex);
    go(null);
  }
});

function go(config) {
  config = config || { roaming: false };

  // Disable data first for some f* reason
  navigator.mozSettings.createLock().set({
    'ril.data.enabled': false,
    'ftu.ril.data.enabled': false,
    'ril.data.roaming_enabled': config.roaming
  });

  // For every SIM card enable radio
  (function enableRadio() {
    [].forEach.call(navigator.mozMobileConnections, function(conn) {
      conn.addEventListener('radiostatechange', function() {
        console.log('radiostate is now', conn.radioState);
      });

      console.log('at startup conn has', conn.radioState);

      function rsc() {
        // Sometimes radioState is enabled here,
        // and thats wrong so we should do this again after that
        if (conn.radioState === 'disabled') {
          conn.removeEventListener('radiostatechange', rsc);
        }

        var sre = conn.setRadioEnabled(true);
        sre.onerror = function() {
          console.error('Failed to enable radio for', conn);
        };
      }

      if (conn.radioState === 'disabled') {
        rsc();
      }
      else {
        conn.addEventListener('radiostatechange', rsc);
      }
    });
  })();

  // Connect to Wifi
  function connectToWifi(network, pass) {
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
  if (config.network && config.password) {
    navigator.mozSettings.createLock().set({ 'wifi.enabled': true }).onsuccess = function() {
      connectToWifi(config.network, config.password);

      window.reconnectWifi = connectToWifi.bind(this, config.network, config.password);
    };
  }
  else {
    navigator.mozSettings.createLock().set({ 'wifi.enabled': false });
  }

  navigator.mozIccManager.oniccdetected = function(e) {
    console.log('new icc detected', e.iccId);
    enableOperatorVariantHandler(e.iccId, 0); // <- multi sim bug would this be
  }

  function enableOperatorVariantHandler(id, ix) {
    window.iccManager = navigator.mozIccManager;

    window['ovh' + ix] = new OperatorVariantHandler(id, ix);
    window['ovh' + ix].init();

    setTimeout(function() {
      console.log('Tried enabling data');
      navigator.mozSettings.createLock().set({
        'ril.data.enabled': true,
        'ftu.ril.data.enabled': true,
        'ril.data.roaming_enabled': true
      });
    }, 3000);

    var conn = navigator.mozMobileConnections[ix];
    var lastState = conn.data.connected;
    conn.addEventListener('datachange', function(e) {
      // console.log('datachange', e);
      if (conn.data.connected === lastState) {
        return;
      }

      if (conn.data.connected) {
        console.log('Has connection over cellular network');
      }
      else {
        console.log('Lost connection over cellular network');
      }

      lastState = conn.data.connected;
    });
  }
}