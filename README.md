# Hi there!

This is an OS for mobile phones. It's compatible with every Firefox OS device.
Connect a Firefox OS device to your computer and run:

```bash
make reset-phone
```

**This will wipe out your full device**

## Incremental build

For a quicker non-destructive build run:

```bash
make install-phone
```

## Connect to the outside world

Place a SIM card in the SIM slot and it will connect to cell network.
It also enables data. You can connect to wifi by copying the file in
[wifi_credentials.json.example](js/wifi_credentials.json.example) to
`js/wifi_credentials.json` and filling in your credentials.

## What can it do?

Display 'Hello world'. But it's really meant to be used when you take apart
a phone and embed it into something else. You have JS access to sensors, WiFi,
etc.

## Why?!

Because playing with phones is awesome. Also for my talk at
[JSConf.eu](http://2014.jsconf.eu/speakers/#/speakers/jan-jongboom-abusing-phones-to-make-the-internet-of-things).