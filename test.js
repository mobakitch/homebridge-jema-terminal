const gpio = require("rpi-gpio");

const options = {
  "monitor": {
      "pin": 23,
      "inverted": true
  },
  "control": {
      "pin": 24,
      "duration": 1000
  }
}

const test = async () => {
  
  await setupGpio(options.control.pin, gpio.DIR_OUT);
  await setupGpio(options.monitor.pin, gpio.DIR_IN);

  const value = await readGpio(options.monitor.pin, options.monitor.inverted);
  console.log(value);
}

const setupGpio = (pin, inout) => {
  return new Promise((resolve, reject) => {
    gpio.setup(pin, inout, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

const readGpio = (pin, inverted) => {
  return new Promise((resolve, reject) => {
    gpio.read(pin, (err, value) => {
      if (err) return reject(err);
      resolve(inverted ? !value : !!value);
    });
  });
}

const writeGpio = (pin, value) => {
  return new Promise((resolve, reject) => {
    gpio.write(pin, value, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

const sleep = (timeout) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

test();