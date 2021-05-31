const express = require('express');
const { Sonos } = require('sonos');
const { createBluetooth } = require('node-ble');
const { bluetooth } = createBluetooth();
require('dotenv').config();

const app = express();
const port = 3000;

const sonosDevice = new Sonos(process.env.SONOS_IP);
let bleDevice = null;

const connectBle = async (ble) => {
  try {
    const adapter = await ble.defaultAdapter();

    if (!(await adapter.isDiscovering())) {
      await adapter.startDiscovery();
    }
    const device = await adapter.waitDevice(process.env.MAC_ADDRESS_BLE_DEVICE);
    return device;
  } catch (error) {
    console.log(error);
  }
};

app.get('/', (req, res) => {
  res.send('Hello from BLE-Express!');
});

app.get('/play', async (req, res) => {
  await sonosDevice.play();
  res.send('Sonos is playing');
});

app.get('/stop', async (req, res) => {
  await sonosDevice.stop();
  res.send('Sonos stopped playing');
});

app.get('/connect', async (req, res) => {
  bleDevice = await connectBle(bluetooth);
  await bleDevice.connect();
  const gattServer = await bleDevice.gatt();
  const service = await gattServer.getPrimaryService(
    process.env.PRIMARY_SERVICE
  );
  const characteristic = await service.getCharacteristic(
    process.env.CHARACTERISTIC
  );
  await characteristic.startNotifications();
  let volume_old = 0;
  characteristic.on('valuechanged', (buffer) => {
    buffer = Buffer.from(buffer, 'hex');
    let choice = buffer.toString();
    console.log(`My choice: ${choice}`);
    let volume_new = parseInt(choice);
    console.log(`Volume new: ${volume_new}`);
    console.log(`Volume old: ${volume_old}`);
    if (choice === 'play') {
      sonosDevice
        .play()
        .then(() => console.log('Sonos is playing'))
        .catch((e) => console.log(e));
    }

    if (choice === 'stop') {
      sonosDevice
        .stop()
        .then(() => console.log('Sonos is stopping'))
        .catch((e) => console.log(e));
    }

    if (choice === 'NPO Radio 1') {
      sonosDevice
        .playTuneinRadio('s17523', 'NPO Radio 1')
        .then(() => console.log('Sonos is playing NPO Radio 1'))
        .catch((e) => console.log(e));
    }

    if (choice === 'NPO Radio 2') {
      sonosDevice
        .playTuneinRadio('s9483', 'NPO Radio 2')
        .then(() => console.log('Sonos is playing NPO Radio 2'))
        .catch((e) => console.log(e));
    }

    if (volume_new > volume_old) {
      console.log('changing volume up');
      sonosDevice.setVolume(volume_old + 3);
      volume_old = volume_new;
    }

    if (volume_new < volume_old) {
      console.log('changing volume down');
      sonosDevice.setVolume(volume_old - 3);
      volume_old = volume_new;
    }
  });
  res.send('Bluetooth device is connected');
});

app.get('/disconnect', async (req, res) => {
  try {
    await bleDevice.disconnect();
    bleDevice = null;
    res.send('Bluetooth device is disconnected');
  } catch (e) {
    console.log(e);
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
