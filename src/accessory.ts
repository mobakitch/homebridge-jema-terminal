import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";
import gpio from "rpi-gpio";

let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("JEMATerminal", JEMATerminal);
};

class JEMATerminal implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;

  private readonly switchService: Service;
  private readonly informationService: Service;

  private readonly options: any;

  private currentValue: boolean = false;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.options = config.options;

    this.switchService = new hap.Service.Switch(this.name);
    this.switchService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => callback(undefined, this.currentValue))
      .on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        const currentValue = await this.readGpio(this.options.monitor.pin, this.options.monitor.inverted);
        if (currentValue != value) {
          await this.writeGpio(this.options.control.pin, true);
          await this.sleep(this.options.control.duration);
          await this.writeGpio(this.options.control.pin, false);
          this.currentValue = await this.readGpio(this.options.monitor.pin, this.options.monitor.inverted);
        }
        callback(undefined, this.currentValue);
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Kawabata Farm")
      .setCharacteristic(hap.Characteristic.Model, "JEM-A Terminal");

    api.on('didFinishLaunching', () => {
      this.accessoryMain();
    }).on('shutdown', () => {
      this.shutdown();
    });
    
    log.info("JEM-A Terminal finished initializing!");
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.switchService,
    ];
  }

  private async accessoryMain(): Promise<void> {
    gpio.setMode(gpio.MODE_BCM);
    await this.setupGpio(this.options.monitor.pin, gpio.DIR_IN);
    await this.setupGpio(this.options.control.pin, gpio.DIR_OUT);

    gpio.on('change', (channel, value) => {
      this.log(`changed to ${value} channel: ${channel}`);
      if (channel == this.options.monitor.pin) {
        this.currentValue = this.options.monitor.inverted ? !value : !!value;
      }
    });

    this.currentValue = await this.readGpio(this.options.monitor.pin, this.options.monitor.inverted);
  }

  private shutdown(): void {
  }

  private setupGpio(pin: number, inout: any): Promise<void> {
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

  private readGpio(pin: number, inverted: boolean): Promise<boolean> {
    return new Promise((resolve, reject) => {
      gpio.read(pin, (err, value) => {
        if (err) return reject(err);
        resolve(inverted ? !value : !!value);
      });
    });
  }

  private writeGpio(pin: number, value: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      gpio.write(pin, value, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private sleep(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  }

}
