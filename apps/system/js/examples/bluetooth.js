window.addEventListener('ready', ev => {
  var cAddress = ev.detail.bluetooth && ev.detail.bluetooth.audioAddress;

  window.enableBluetoothAudio = function(aAddress) {
    var address = aAddress || cAddress;
    if (!address) {
      return console.error('No bluetooth audio address passed in...');
    }

    return new Promise(function(res, rej) {
      function pair() {
        console.log('[BT] Looking for devices...');

        var adapterReq = navigator.mozBluetooth.getDefaultAdapter();
        adapterReq.onsuccess = function() {
          var adapter = adapterReq.result;

          var discoveryTimeout = setTimeout(function() {
            console.error('Could not find device within 30s');
            adapter.stopDiscovery();
            adapter.ondevicefound = null;
            navigator.mozSettings.createLock().set({ 'bluetooth.enabled': false });

            rej('Discovery timed out');
          }, 30000);

          adapter.ondevicefound = function(e) {
            if (e.device.address === address) {
              console.log('[BT] Found ' + address);

              function doConnect() {
                var connRequest = adapter.connect(e.device);
                connRequest.onsuccess = function() {
                  console.log('[BT] Connected');
                  adapter.ondevicefound = null;
                  res();
                };
                connRequest.onerror = function() {
                  console.error('[BT] Could not connect', connRequest.error);
                  adapter.ondevicefound = null;
                  rej(connRequest.error);
                };
              }

              if (adapter.devices.indexOf(address) > -1) {
                doConnect();
              }
              else {
                var pr = adapter.pair(e.device.address);
                pr.onsuccess = function() {
                  console.log('[BT] Pairing succeeded');
                  doConnect();
                };
                pr.onerror = function() {
                  console.error('[BT] Pairing failed', pr.error);
                  rej(pr.error);
                };
              }

              window.btAdapter = adapter;
              window.btDevice = e.device;

              clearTimeout(discoveryTimeout);
              adapter.stopDiscovery();
            }
          };
          adapter.startDiscovery();
        };
        adapterReq.onerror = function() {
          console.error('Cannot find adapter');
          rej('Cannot get defaultAdapter');
        };
      }

      navigator.mozBluetooth.onenabled = function() {
        pair();
      };

      navigator.mozBluetooth.ondisabled = function() {
        console.log('Bluetooth is disabled now');
      };

      if (!navigator.mozBluetooth.enabled) {
        navigator.mozSettings.createLock().set({ 'bluetooth.enabled': true });
      }
      else {
        pair();
      }
    });
  };

  window.findBluetoothDevices = function(discoveryTimeout) {
    if (!navigator.mozBluetooth.enabled) {
      navigator.mozSettings.createLock().set({ 'bluetooth.enabled': true });
    }
    else {
      discover();
    }

    navigator.mozBluetooth.onenabled = function() {
      discover();
    };

    function discover() {
      var adapterReq = navigator.mozBluetooth.getDefaultAdapter();
      adapterReq.onsuccess = function() {
        var adapter = adapterReq.result;

        setTimeout(function() {
          console.log('Stopping discovery');
          adapter.ondevicefound = null;
          adapter.stopDiscovery();
        }, discoveryTimeout || 10000);

        adapter.ondevicefound = function(e) {
          console.log('Found device', e.device.address, e.device.name, e.device.icon);
        };

        console.log('Starting discovery');
        adapter.startDiscovery();
      };
    }
  };

  console.log('Bluetooth ready');
});
