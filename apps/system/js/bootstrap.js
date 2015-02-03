/**
 * bootstrap.js
 *
 * This file does a number of things:
 *
 * 1. It preps the frontend, registers itself with Gecko, turns on the screen,
 *    sets some initial settings, etc. At the end it will emit a ready event,
 *    and your own code can run. See the examples/ folder.
 * 2. Manage WiFi connections for you based on local_settings.json file.
 *    If you want to do this yourself, remove the section.
 * 3. Manage cellular connections for you based on same file.
 *    Also if you want to manage that yourself, remove the section.
 * 4. Add autogrant, because you cannot grant permissions w/o display
 */
new Promise(res => {
  // Wait until the page is loaded
  document.readyState === 'complete' ? res() : window.onload = res;
}).then(() => {
  // Register ourselfs with Gecko
  var evt = new CustomEvent('mozContentEvent',
    { bubbles: true, cancelable: false,
      detail: { type: 'system-message-listener-ready' } });
  window.dispatchEvent(evt);

  // Listen for wakelock events
  window.cpuManager = new CpuManager();
  window.cpuManager.start();

  // Disable cpuSleepAllowed, need to be explicitely run by user
  navigator.mozPower.cpuSleepAllowed = false;
}).then(() => {
  // Turn the screen on

  // No clue why this is needed but it works.
  navigator.mozPower.screenBrightness = 0.9;

  return new Promise((res, rej) => {
    setTimeout(function () {
      navigator.mozPower.screenEnabled = true;
      navigator.mozPower.screenBrightness = 1;
      res();
    }, 100);
  });
}).then(() => {
  // Initial settings
  return new Promise((res, rej) => {
    var req = navigator.mozSettings.createLock().set({
      'ril.data.enabled': false,
      'ftu.ril.data.enabled': false,
      'ril.data.roaming_enabled': false,
      'wifi.enabled': false,
      'debugger.remote-mode': 'adb-devtools',
      'devtools.debugger.remote-enabled': true, // pre-1.4
      'app.reportCrashes': 'always'
    });
    req.onsuccess = res;
    req.onerror = rej;
  });
}).then(() => {
  console.log('Wrote settings successfully');
  // Fetching local_settings.json
  return new Promise((res, rej) => {
    var x = new XMLHttpRequest();
    x.onload = function() {
      if (x.status !== 200) {
        console.warn('Could not fetch js/local_settings.json, please add it', x.status);
        return res({});
      }

      var c = x.response;
      res(c);
    };
    x.onerror = function() {
      console.warn('Could not fetch js/local_settings.json, please add it', x.error);
      res({});
    };

    x.open('GET', '/js/local_settings.json');
    x.responseType = 'json';
    try {
      x.send();
    }
    catch (ex) {
      console.warn('Could not fetch js/local_settings.json, please add it', ex);
      res({});
    }
  });
}).then(localSettings => {
  (document.querySelector('.status') || {}).textContent = 'Ready';

  window.addEventListener('online', () => {
    (document.querySelector('.status') || {}).textContent = 'Ready & connected';
  });
  window.addEventListener('offline', () => {
    (document.querySelector('.status') || {}).textContent = 'Ready (no connection)';
  });

  startRadio(localSettings.cellular);
  startWifi(localSettings.wifi);
  startAutogrant();

  window.dispatchEvent(new CustomEvent('ready', { detail: localSettings }));
}).catch(err => {
  navigator.vibrate(200);

  console.error('Booting failed', err);

  (document.querySelector('.status') || {}).textContent = 'Booting failed, check console';
});


/**
 * Radio
 */
function startRadio(options) {
  options = options || {
    edgeOnly: false,
    roaming: false
  };

  var needsPinButNoPinRequired = false;

  window.unlockSim = function(pin, alsoRemoveSimLock) {
    options.pin = pin;
    needsPinButNoPinRequired = false;

    var icc = navigator.mozIccManager.getIccById(
      navigator.mozIccManager.iccIds[0]);

    unlockPinIfNeeded(icc, function() {
      var r2 = icc.setCardLock({ lockType: 'pin', pin: pin, enabled: false });
      r2.onsuccess = function() {
        console.log('removed pin');
      };
      r2.onerror = function(err) {
        console.error('remove pin failed', err);
      };
    });
  };

  function unlockPinIfNeeded(icc, cb) {
    if (!icc) {
      return;
    }
    if (needsPinButNoPinRequired) {
      return;
    }
    if (icc.cardState !== 'ready') {
      console.log('SIM Card state', icc.iccInfo.iccid, icc.cardState);
    }
    if (icc.cardState === 'pinRequired') {
      if (!options.pin) {
        needsPinButNoPinRequired = true;
        return console.warn('SIM needs PIN but no PIN supplied');
      }
      var req = icc.unlockCardLock({ lockType: 'pin', pin: options.pin });
      req.onsuccess = cb;
      req.onerror = function(err) {
        console.error('Could not unlock SIM', err);
      };
    }
  }

  function enableRadio() {
    var networkType = options.edgeOnly ? ['gsm'] : ['wcdma/gsm-auto'];

    // For every SIM card enable radio
    [].forEach.call(navigator.mozMobileConnections, function(conn) {
      conn.setPreferredNetworkType(networkType[0]);

      conn.onradiostatechange = function() {
        console.log('Radio state change', conn.radioState);

        if (needsPinButNoPinRequired === true) {
          return;
        }

        if (conn.radioState === 'enabled') {
          // @todo multisim bug
          unlockPinIfNeeded(navigator.mozIccManager.getIccById(navigator.mozIccManager.iccIds[0]));

          setTimeout(() => {
            unlockPinIfNeeded(navigator.mozIccManager.getIccById(navigator.mozIccManager.iccIds[0]));
          }, 5000);
        }
      };

      function rsc() {
        // Sometimes radioState is enabled here,
        // and thats wrong so we should do this again after that
        if (conn.radioState === 'disabled') {
          conn.removeEventListener('radiostatechange', rsc);
        }

        // todo: when status is 'enabling' we shouldnt call this I think
        // doesnt cause much harm though.
        var sre = conn.setRadioEnabled(true);
        sre.onerror = function(err) {
          console.error('Failed to enable radio for', conn, err);
        };
      }

      if (conn.radioState === 'disabled') {
        rsc();
      }
      else {
        conn.addEventListener('radiostatechange', rsc);
      }
    });

    navigator.mozSettings.createLock().set({
      'ril.radio.preferredNetworkType': networkType
    });
  }

  function enable() {
    var r = navigator.mozSettings.createLock().set({
        'ril.radio.disabled': false
      });

    r.onsuccess = () => enableRadio();
    r.onerror = err => console.error('error');
  }

  function disable() {
    var r = navigator.mozSettings.createLock().set({
        'ril.radio.disabled': true
      });

    r.onsuccess = r.onerror = () => {
      [].forEach.call(navigator.mozMobileConnections, function(conn) {
        conn.setRadioEnabled(false);
      });
    };
  }

  // Todo: find whether this actually works still...
  navigator.mozIccManager.oniccdetected = function(e) {
    var icc = navigator.mozIccManager.getIccById(e.iccId);
    unlockPinIfNeeded(icc);
    icc.oncardstatechange = () => unlockPinIfNeeded(icc);
    enableOperatorVariantHandler(e.iccId, 0); // <- multi sim bug would this be

    // weird stuff going on here, have to re-retrieve the icc because cardState
    // sometimes doesnt get updated...
    setTimeout(() => unlockPinIfNeeded(navigator.mozIccManager.getIccById(e.iccId)), 5000);
    setTimeout(() => unlockPinIfNeeded(navigator.mozIccManager.getIccById(e.iccId)), 10000);
    setTimeout(() => unlockPinIfNeeded(navigator.mozIccManager.getIccById(e.iccId)), 20000);
  };

  navigator.mozIccManager.iccIds.forEach((iccId, ix) => {
    enableOperatorVariantHandler(iccId, ix);
  });

  function enableOperatorVariantHandler(id, ix) {
    var iccManager = window.iccManager = navigator.mozIccManager;

    var ovh = window['ovh' + ix] = new OperatorVariantHandler(id, ix);
    ovh.init();

    setTimeout(function() {
      console.log('enabling data');
      navigator.mozSettings.createLock().set({
        'ril.data.enabled': true,
        'ftu.ril.data.enabled': true,
        'ril.data.roaming_enabled': options.roaming
      });

      var icc = iccManager.getIccById(id);
      ovh.applySettings(icc.iccInfo.mcc, icc.iccInfo.mnc, true);
    }, 3000);

    var conn = navigator.mozMobileConnections[ix];
    var lastState = conn.data.connected;
    conn.addEventListener('datachange', function(e) {
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

  enableRadio();

  // Done
  window.enableRadio = enable;
  window.disableRadio = disable;
}

/**
 * WiFi
 */
function startWifi(options) {
  options = options || {
    enabled: false
  };

  if (options.enabled && !options.network) {
    return console.error('WiFi network required');
  }
  else if (options.enabled) {
    setTimeout(() => {
      enableWifi();
    });
  }

  var wifiManager = navigator.mozWifiManager;

  var lastIp = null;
  var lastWifiStatus = null;

  // So what happens:
  // 1. Set wifi.enabled -> true
  // 2. wifiManager.onenabled fires, and calls doConnect
  // 3. doConnect calls connectToWifi (which returns promise)
  // 4. connectToWifi starts by trying to associate with the network
  // 5. If that succeeds wifiManager.onstatuschange will at one point have
  //    connected. If so resolve promise.
  // 6. If onstatuschange goes to disconnect, reject the promise

  // We need to have some wrappers around wifi connections in place
  function enableWifi(network, password) {
    if (network) options.network = network;
    if (password) options.password = password;

    options.enabled = true;
    navigator.mozSettings.createLock().set({ 'wifi.enabled': true });
  }

  function doConnect() {
    connectToWifi(options.network, options.password)
      .then(() => {
        console.log('Wifi connection succeeded');
      })
      .catch(err => {
        console.error('Wifi connection failed', err);
      });
  }

  function disableWifi() {
    options.enabled = false;
    navigator.mozSettings.createLock().set({ 'wifi.enabled': false });
  }

  wifiManager.onenabled = function() {
    setTimeout(function() {
      doConnect();
    }, 1000);
  };
  wifiManager.ondisabled = function() {
    console.log('Wifi was disabled');
  };

  if ('onconnectioninfoupdate' in wifiManager) {
    wifiManager.onconnectioninfoupdate = function(e) {
      if (e.ipAddress && lastIp !== e.ipAddress) {
        console.log('Wifi now has IP', e.ipAddress);
      }
      lastIp = e.ipAddress;
    };
  }

  // Fucking FFOS 1.3 doesnt support addEventListener on wifiManager.
  function restoreStatusChangeEvent() {
    wifiManager.onstatuschange = function(e) {
      if (e.status !== lastWifiStatus) {
        if (e.status === 'connected') {
          console.log('Wifi is now connected to', options.network);
        }
        else {
          console.log('Wifi statuschange', e.status);
        }
        lastWifiStatus = e.status;
      }
    };
  }
  restoreStatusChangeEvent();

  // Connect to Wifi
  function connectToWifi(network, pass) {
    return new Promise((res, rej) => {
      if (!options.enabled) {
        rej('Wifi is not enabled in config');
        return disableWifi();
      }

      // set up a bunch of event listeners
      wifiManager.onstatuschange = function(e) {
        switch (e.status) {
          case 'connected':
            res();
            break;
          case 'disconnected':
            rej('Could not connect to network');
            break;
          default:
            return;
        }
        restoreStatusChangeEvent();
      };

      console.log('Attempting to connect to', network);

      var n = wifiManager.getNetworks();
      n.onsuccess = function() {
        var wifi = n.result.filter(w => w.ssid === network)[0];
        if (!wifi) {
          return rej('Could not find wifi network "' + network + '"');
        }

        if (handleSecurity(wifi, pass) === false) {
          return rej('No support for ' + wifi.security[0]);
        }

        var req = wifiManager.associate(wifi);
        req.onsuccess = () => console.log('Associated', options.network);
        req.onerror = () => {
          // Hmm, this shouldn't really matter either apparently
          console.warn('Associating failed', req.error);
        };
      };
      // For some reason this doesn't matter... Hmm...
      n.onerror = e => console.warn('GetNetworks failed', e);
    });
  }

  function handleSecurity(network, pass) {
    if (network.security.length === 0) {
      // no pass
    }
    else if (network.security[0] === 'WPA-PSK') {
      network.keyManagement = 'WPA-PSK';
      network.psk = pass;
    }
    else {
      return false;
    }
  }

  window.enableWifi = enableWifi;
  window.disableWifi = disableWifi;
}

/**
 * Autogrant
 * Because there will be no UI to grant permissions
 */
function startAutogrant() {
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

    case 'remote-debugger-prompt':
      dump('REMOTE DEBUGGER PROMPT!!!\n');
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
  x.open('GET', 'http://www.telenor.com');
  x.send();
};
