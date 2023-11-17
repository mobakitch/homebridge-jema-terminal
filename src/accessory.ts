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
} from 'homebridge';
import JEMATerminal from 'rpi-jema-terminal';

let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory('JEMATerminal', JEMATerminalAccessory);
};

class JEMATerminalAccessory implements AccessoryPlugin {

  private readonly name: string;

  private readonly switchService: Service;
  private readonly informationService: Service;

  private readonly terminal: JEMATerminal;

  constructor(
    private readonly log: Logging,
    config: AccessoryConfig,
    api: API)
  {
    this.name = config.name;
    this.terminal = new JEMATerminal(config.options);

    this.switchService = new hap.Service.Switch(this.name);
    this.switchService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => callback(undefined, this.terminal.value))
      .on(CharacteristicEventTypes.SET,
        async (value: CharacteristicValue, callback: CharacteristicSetCallback) => callback(undefined, await this.terminal.set(value as boolean)));

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Kawabata Farm')
      .setCharacteristic(hap.Characteristic.Model, 'JEM-A Terminal');

    api.on('didFinishLaunching', () => this.terminal.setup());

    this.terminal.on('change', (value: any) => this.switchService.getCharacteristic(hap.Characteristic.On).updateValue(value));

    log.info('JEM-A Terminal finished initializing!');
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log('Identify!');
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

}
