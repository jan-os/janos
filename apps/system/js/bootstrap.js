// No clue why this is needed but it works.
navigator.mozPower.screenBrightness = 0.9;

setTimeout(function() {
  navigator.mozPower.screenEnabled = true;
  navigator.mozPower.screenBrightness = 1;
}, 100);

window.addEventListener('load', function() {
  navigator.vibrate([ 200, 200, 200 ]);

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
  window.config = config = config || { roaming: false };

  // Disable data first for some f* reason
  navigator.mozSettings.createLock().set({
    'ril.data.enabled': false,
    'ftu.ril.data.enabled': false,
    'ril.data.roaming_enabled': false,
    'wifi.enabled': false
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

  window.enableWifi = function() {
    if (config.network && config.password) {
      window.reconnectWifi = connectToWifi.bind(this, config.network, config.password);
      navigator.mozSettings.createLock().set({ 'wifi.enabled': true });
    }
    else {
      console.error('Please specify network / password in local_settings.json');
    }
  };

  navigator.mozWifiManager.onenabled = function() {
    if (!window.reconnectWifi) {
      return;
    }

    setTimeout(function() {
      window.reconnectWifi();
    }, 1000);
  };
  navigator.mozWifiManager.ondisabled = function() {
    console.log('Wifi was disabled');
  };

  var lastIp = null;
  navigator.mozWifiManager.onconnectioninfoupdate = function(e) {
    if (e.ipAddress && lastIp !== e.ipAddress) {
      console.log('Wifi now has IP', e.ipAddress);
    }
    lastIp = e.ipAddress;
  };

  var lastWifiStatus = null;
  navigator.mozWifiManager.onstatuschange = function(e) {
    if (e.status !== lastWifiStatus) {
      if (e.status === 'connected') {
        console.log('Wifi is now connected to', config.network);
      }
      else {
        console.log('Wifi statuschange', e.status);
      }
      lastWifiStatus = e.status;
    }
  };

  // Connect to Wifi
  function connectToWifi(network, pass) {
    console.log('Attempting to connect to', network);

    var n = navigator.mozWifiManager.getNetworks();
    n.onsuccess = function() {
      var wifi = n.result.filter(function(w) { return w.ssid === network })[0];
      if (!wifi) {
        return console.error('Could not find wifi network "' + network + '"');
      }

      // Only PSK at the moment
      wifi.keyManagement = 'WPA-PSK';
      wifi.psk = pass;

      var req = navigator.mozWifiManager.associate(wifi);
      req.onsuccess = function() {
        console.log('Associated with', config.network);
      };
      req.onerror = function() {
        console.error('Associating failed', req.error);
      };
    };
    n.onerror = function(e) {
      console.error('GetNetworks failed', e);
    };
  }

  navigator.mozIccManager.oniccdetected = function(e) {
    console.log('new icc detected', e.iccId);
    enableOperatorVariantHandler(e.iccId, 0); // <- multi sim bug would this be
  };

  function enableOperatorVariantHandler(id, ix) {
    window.iccManager = navigator.mozIccManager;

    window['ovh' + ix] = new OperatorVariantHandler(id, ix);
    window['ovh' + ix].init();

    setTimeout(function() {
      console.log('Tried enabling data');
      navigator.mozSettings.createLock().set({
        'ril.data.enabled': true,
        'ftu.ril.data.enabled': true,
        'ril.data.roaming_enabled': config.roaming
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

  // Autogrant permissions
  window.addEventListener('mozChromeEvent', function(evt) {
    var detail = evt.detail;
    switch (detail.type) {
    case 'permission-prompt':
      console.log('autogrant permissions for', detail.permissions);

      var ev2 = document.createEvent('CustomEvent');
      ev2.initCustomEvent('mozContentEvent', true, true, {
        id: detail.id,
        type: 'permission-allow',
        remember: true
      });
      window.dispatchEvent(ev2);
      break;
    }
  });
}

window.testXhr = function() {
  var x = new XMLHttpRequest({ mozSystem: true });
  x.onload = function() {
    console.log('xhr onload', x.status);
  };
  x.onerror = function() {
    console.error('xhr onerror', x.error);
  };
  x.open('GET', 'http://janjongboom.com');
  x.send();
};
