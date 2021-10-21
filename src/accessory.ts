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
const gpiop = gpio.promise;

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
      .on(CharacteristicEventTypes.SET, this.onSet);

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Kawabata Farm")
      .setCharacteristic(hap.Characteristic.Model, "JEM-A Terminal");

    api.on('didFinishLaunching', this.accessoryMain)
      .on('shutdown', this.shutdown);
    
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
    await gpiop.setup(this.options.monitor.pin, gpio.DIR_IN, gpio.EDGE_BOTH);
    await gpiop.setup(this.options.control.pin, gpio.DIR_OUT, gpio.EDGE_NONE);

    gpio.on('change', this.onChange);

    this.currentValue = this.normalizeMonitorValue(await gpiop.read(this.options.monitor.pin));
  }

  private shutdown(): void {
  }

  private onChange(channel: any, value: any): void {
    if (channel == this.options.monitor.pin) {
      this.log(`changed to ${value} channel: ${channel}`);
      this.currentValue = this.normalizeMonitorValue(value);
      this.switchService.getCharacteristic(hap.Characteristic.On)
        .updateValue(this.currentValue);
    }
  }

  private async onSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    const currentValue = this.normalizeMonitorValue(await gpiop.read(this.options.monitor.pin));
    if (currentValue != value) {
      await gpiop.write(this.options.control.pin, true);
      await this.sleep(this.options.control.duration);
      await gpiop.write(this.options.control.pin, false);
      this.currentValue = value as boolean;
    }
    callback(undefined, this.currentValue);
  }

  private normalizeMonitorValue(value: boolean): boolean {
    return this.options.monitor.inverted ? !value : !!value;
  }

  private sleep(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

}
