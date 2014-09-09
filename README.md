# Hi there!

This is an OS for mobile phones. It's compatible with every Firefox OS device.
Connect a Firefox OS device to your computer and run:

```bash
make reset-phone
```

To debug, open the App Manager and connect. There'll be just one app.

**This will wipe out your full device**

## Incremental build

For a quicker non-destructive build run:

```bash
make install-phone
```

Sometimes things won't work (no output in console), then just run reset-phone.

## Connect to the outside world

Place a SIM card in the SIM slot and it will connect to cell network.
It also enables data.

You can connect to wifi by copying the file in
[local_settings.json.example](js/local_settings.json.example) to
`js/local_settings.json` and filling in your credentials.
This will only work with WPA networks for now, because I'm lazy.
See shared/js/wifi_helper.js setPassword function for connecting to WEP and
WPA-EAP networks and incorporate the code as needed.
You need to be plugged into USB to enable wifi as otherwise the drain is too big
and the device will shut down (at least on GP Peak). Call `window.enableWifi()`
to enable it anyway.

## What can it do?

Display 'Hello world'. But it's really meant to be used when you take apart
a phone and embed it into something else. You have JS access to sensors, WiFi,
etc.

## Why?!

Because playing with phones is awesome. Also for my talk at
[JSConf.eu](http://2014.jsconf.eu/speakers/#/speakers/jan-jongboom-abusing-phones-to-make-the-internet-of-things).