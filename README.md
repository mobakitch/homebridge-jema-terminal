# homebridge-jema-terminal

JEM-A Terminal accessory plugin for [Homebridge](https://github.com/homebridge/homebridge)

## Configuration

Example configuration:

```json
"accessories": [
   {
      "accessory": "JEMATerminal",
      "name": "Floor heater",
      "options": {
         "monitor": {
            "pin": 23,
            "inverted": true
         },
         "control": {
            "pin": 24,
            "duration": 1000
         }
      }
   }
]
```
