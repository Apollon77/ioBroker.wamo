'use strict';

/*
 * Created with @iobroker/create-adapter v2.1.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const axios = require('axios');
const schedule = require('node-schedule');
const { join } = require('path');
const { stringify } = require('querystring');

const adapterName = require('./package.json').name.split('.').pop();

const cron_Year = '0 0 1 1 *';
const cron_Month = '0 0 1 * *';
const cron_Week = '0 0 * * 1';
const cron_Day = '0 0 * * *';

//Reference to my own adapter
let myAdapter;

// Variable for Timer IDs
let alarm_Intervall_ID;
let short_Intervall_ID;
let long_Intervall_ID;

let sensor_temperature_present = false;
let sensor_pressure_present = false;
let sensor_conductivity_present = false;

let device_responsive = false;
let interfaceBussy;

// number of connection attemts before throwing an error and exiting
const connectionRetrys = 5;
const connectionRetryPause = 3000;

const adapterChannels = {
	DeviceInfo: {
		path: 'Device.Info',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device info',
					'de': 'Geräteinformationen',
					'ru': 'Информация об устройстве',
					'pt': 'Informação do dispositivo',
					'nl': 'Apparaat info',
					'fr': 'Info appareil',
					'it': 'Informazioni sul dispositivo',
					'es': 'Información del dispositivo',
					'pl': 'Informacje o urządzeniu',
					'zh-cn': '设备信息'
				},
			},
			native: {}
		}
	},
	DeviceSettings: {
		path: 'Device.Settings',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device settings',
					'de': 'Geräteeinstellungen',
					'ru': 'Настройки устройства',
					'pt': 'Configurações do dispositivo',
					'nl': 'Apparaat instellingen',
					'fr': "Réglages de l'appareil",
					'it': 'Impostazioni del dispositivo',
					'es': 'Configuración de dispositivo',
					'pl': 'Ustawienia urządzenia',
					'zh-cn': '设备设置'
				},
			},
			native: {}
		}
	},
	DeviceSettingsSensors: {
		path: 'Device.Settings.Sensors',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Sensors',
					'de': 'Sensoren',
					'ru': 'Датчики',
					'pt': 'Sensores',
					'nl': 'Sensoren',
					'fr': 'Capteurs',
					'it': 'Sensori',
					'es': 'Sensores',
					'pl': 'Czujniki',
					'zh-cn': '传感器'
				},
			},
			native: {}
		}
	},
	DeviceConditions: {
		path: 'Device.Device-Conditions',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device conditions',
					'de': 'Gerätebedingungen',
					'ru': 'Условия устройства',
					'pt': 'Condições do dispositivo',
					'nl': 'Apparaatvoorwaarden',
					'fr': "État de l'appareil",
					'it': 'Condizioni del dispositivo',
					'es': 'Condiciones del dispositivo',
					'pl': 'Warunki urządzenia',
					'zh-cn': '设备条件'
				},
			},
			native: {}
		}
	},
	DevicePofiles: {
		path: 'Device.Profiles',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device profiles',
					'de': 'Geräteprofile',
					'ru': 'Профили устройств',
					'pt': 'Perfis de dispositivo',
					'nl': 'Apparaatprofielen',
					'fr': "Profils d'appareils",
					'it': 'Profili dispositivo',
					'es': 'Perfiles de dispositivos',
					'pl': 'Profile urządzeń',
					'zh-cn': '设备配置文件'
				},
			},
			native: {}
		}
	},
	DevicePofile1: {
		path: 'Device.Profiles.1',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device profile 1',
					'de': 'Geräteprofil 1',
					'ru': 'Профиль устройства 1',
					'pt': 'Perfil do dispositivo 1',
					'nl': 'Apparaatprofiel 1',
					'fr': "Profil d'appareil 1",
					'it': 'Profilo dispositivo 1',
					'es': 'Perfil de dispositivo 1',
					'pl': 'Profil urządzenia 1',
					'zh-cn': '设备配置文件 1'
				},
			},
			native: {}
		}
	},
	DevicePofile2: {
		path: 'Device.Profiles.2',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device profile 2',
					'de': 'Geräteprofil 2',
					'ru': 'Профиль устройства 2',
					'pt': 'Perfil do dispositivo 2',
					'nl': 'Apparaatprofiel 2',
					'fr': "Profil d'appareil 2",
					'it': 'Profilo dispositivo 2',
					'es': 'Perfil de dispositivo 2',
					'pl': 'Profil urządzenia 2',
					'zh-cn': '设备配置文件 2'
				},
			},
			native: {}
		}
	},
	DevicePofile3: {
		path: 'Device.Profiles.3',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device profile 3',
					'de': 'Geräteprofil 3',
					'ru': 'Профиль устройства 3',
					'pt': 'Perfil do dispositivo 3',
					'nl': 'Apparaatprofiel 3',
					'fr': "Profil d'appareil 3",
					'it': 'Profilo del dispositivo 3',
					'es': 'Perfil de dispositivo 3',
					'pl': 'Profil urządzenia 3',
					'zh-cn': '设备配置文件 3'
				},
			},
			native: {}
		}
	},
	DevicePofile4: {
		path: 'Device.Profiles.4',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device profile 4',
					'de': 'Geräteprofil 4',
					'ru': 'Профиль устройства 4',
					'pt': 'Perfil do dispositivo 4',
					'nl': 'Apparaatprofiel 4',
					'fr': "Profil d'appareil 4",
					'it': 'Profilo del dispositivo 4',
					'es': 'Perfil de dispositivo 4',
					'pl': 'Profil urządzenia 4',
					'zh-cn': '设备配置文件 4'
				},
			},
			native: {}
		}
	},
	DevicePofile5: {
		path: 'Device.Profiles.5',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device profile 5',
					'de': 'Geräteprofil 5',
					'ru': 'Профиль устройства 5',
					'pt': 'Perfil do dispositivo 5',
					'nl': 'Apparaatprofiel 5',
					'fr': "Profil d'appareil 5",
					'it': 'Profilo del dispositivo 5',
					'es': 'Perfil de dispositivo 5',
					'pl': 'Profil urządzenia 5',
					'zh-cn': '设备配置文件 5'
				},
			},
			native: {}
		}
	},
	DevicePofile6: {
		path: 'Device.Profiles.6',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device profile 6',
					'de': 'Geräteprofil 6',
					'ru': 'Профиль устройства 6',
					'pt': 'Perfil do dispositivo 6',
					'nl': 'Apparaatprofiel 6',
					'fr': "Profil d'appareil 6",
					'it': 'Profilo del dispositivo 6',
					'es': 'Perfil de dispositivo 6',
					'pl': 'Profil urządzenia 6',
					'zh-cn': '设备配置文件 6'
				},
			},
			native: {}
		}
	},
	DevicePofile7: {
		path: 'Device.Profiles.7',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device profile 7',
					'de': 'Geräteprofil 7',
					'ru': 'Профиль устройства 7',
					'pt': 'Perfil do dispositivo 7',
					'nl': 'Apparaatprofiel 7',
					'fr': "Profil d'appareil 7",
					'it': 'Profilo del dispositivo 7',
					'es': 'Perfil de dispositivo 7',
					'pl': 'Profil urządzenia 7',
					'zh-cn': '设备配置文件 7'
				},
			},
			native: {}
		}
	},
	DevicePofile8: {
		path: 'Device.Profiles.8',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Device profile 8',
					'de': 'Geräteprofil 8',
					'ru': 'Профиль устройства 8',
					'pt': 'Perfil do dispositivo 8',
					'nl': 'Apparaatprofiel 8',
					'fr': "Profil d'appareil 8",
					'it': 'Profilo del dispositivo 8',
					'es': 'Perfil de dispositivo 8',
					'pl': 'Profil urządzenia 8',
					'zh-cn': '设备配置文件 8'
				},
			},
			native: {}
		}
	},
	WaterCondition: {
		path: 'Device.Water-Conditions',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Water Condition',
					'de': 'Wasserzustand',
					'ru': 'Состояние воды',
					'pt': 'Condição da Água',
					'nl': 'Waterconditie',
					'fr': "État de l'eau",
					'it': "Condizione dell'acqua",
					'es': 'Condición del agua',
					'pl': 'Stan wody',
					'zh-cn': '水质'
				},
			},
			native: {}
		}
	},
	WaterConumption: {
		path: 'Device.Water-Consumption',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Water consumption',
					'de': 'Wasserverbrauch',
					'ru': 'Потребление воды',
					'pt': 'Consumo de água',
					'nl': 'Waterverbruik',
					'fr': "Consommation d'eau",
					'it': "Consumo d'acqua",
					'es': 'Consumo de agua',
					'pl': 'Konsumpcja wody',
					'zh-cn': '耗水量'
				},
			},
			native: {}
		}
	},
	WaterStatistic: {
		path: 'Device.Statistics',
		channel: {
			type: 'channel',
			common: {
				name: {
					'en': 'Statistics',
					'de': 'Statistiken',
					'ru': 'Статистика',
					'pt': 'Estatisticas',
					'nl': 'Statistieken',
					'fr': 'Statistiques',
					'it': 'Statistiche',
					'es': 'Estadísticas',
					'pl': 'Statystyka',
					'zh-cn': '统计数据'
				},
			},
			native: {}
		}
	},
};

const StatisticStates = {
	TotalLastValue: {
		id: 'TLV',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'last total value',
					'de': 'letzter Gesamtwert',
					'ru': 'последнее общее значение',
					'pt': 'último valor total',
					'nl': 'laatste totale waarde',
					'fr': 'dernière valeur totale',
					'it': 'ultimo valore totale',
					'es': 'último valor total',
					'pl': 'ostatnia łączna wartość',
					'zh-cn': '最后总价值'
				},
				type: 'number',
				unit: 'l',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterStatistic.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	TotalDay: {
		id: 'TCD',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'total current day',
					'de': 'insgesamt aktueller Tag',
					'ru': 'общий текущий день',
					'pt': 'dia atual total',
					'nl': 'totale huidige dag',
					'fr': 'total du jour en cours',
					'it': 'giorno corrente totale',
					'es': 'dia actual total',
					'pl': 'całkowity bieżący dzień',
					'zh-cn': '当日总计'
				},
				type: 'number',
				unit: 'l',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterStatistic.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	TotalWeek: {
		id: 'TCW',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'total current week',
					'de': 'insgesamt aktuelle Woche',
					'ru': 'всего за текущую неделю',
					'pt': 'semana atual total',
					'nl': 'totale huidige week',
					'fr': 'total semaine en cours',
					'it': 'totale settimana corrente',
					'es': 'total de la semana actual',
					'pl': 'całkowity bieżący tydzień',
					'zh-cn': '本周总计'
				},
				type: 'number',
				unit: 'l',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterStatistic.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	TotalMonth: {
		id: 'TCM',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'total current month',
					'de': 'insgesamt aktueller Monat',
					'ru': 'всего за текущий месяц',
					'pt': 'total do mês atual',
					'nl': 'totale huidige maand',
					'fr': 'total du mois en cours',
					'it': 'mese corrente totale',
					'es': 'total del mes actual',
					'pl': 'całkowity bieżący miesiąc',
					'zh-cn': '本月总计'
				},
				type: 'number',
				unit: 'l',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterStatistic.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	TotalYear: {
		id: 'TCY',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'total current year',
					'de': 'insgesamt laufendes Jahr',
					'ru': 'всего за текущий год',
					'pt': 'total do ano atual',
					'nl': 'totaal huidig jaar',
					'fr': "total de l'année en cours",
					'it': 'totale anno in corso',
					'es': 'total del año en curso',
					'pl': 'całkowity bieżący rok',
					'zh-cn': '本年度总计'
				},
				type: 'number',
				unit: 'm3',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterStatistic.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	TotalPastDay: {
		id: 'TPD',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'total past day',
					'de': 'total vergangener tag',
					'ru': 'всего за прошедший день',
					'pt': 'total do dia anterior',
					'nl': 'totaal afgelopen dag',
					'fr': 'total de la journée passée',
					'it': 'giorno passato totale',
					'es': 'días pasados totales',
					'pl': 'łącznie miniony dzień',
					'zh-cn': '过去的总天数'
				},
				type: 'number',
				unit: 'l',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterStatistic.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	TotalPastWeek: {
		id: 'TPW',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'total past week',
					'de': 'insgesamt vergangene Woche',
					'ru': 'всего за прошлую неделю',
					'pt': 'total da semana passada',
					'nl': 'totaal afgelopen week',
					'fr': 'total de la semaine dernière',
					'it': 'totale della scorsa settimana',
					'es': 'semana pasada total',
					'pl': 'łącznie zeszły tydzień',
					'zh-cn': '过去一周总计'
				},
				type: 'number',
				unit: 'l',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterStatistic.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	TotalPastMonth: {
		id: 'TPM',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'total past month',
					'de': 'insgesamt letzten Monat',
					'ru': 'всего за прошлый месяц',
					'pt': 'total do mês passado',
					'nl': 'totaal afgelopen maand',
					'fr': 'total du mois passé',
					'it': 'totale del mese scorso',
					'es': 'mes pasado total',
					'pl': 'łącznie ostatni miesiąc',
					'zh-cn': '过去一个月总计'
				},
				type: 'number',
				unit: 'l',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterStatistic.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	TotalPastYear: {
		id: 'TPY',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'total past year',
					'de': 'insgesamt vergangenes Jahr',
					'ru': 'всего за прошлый год',
					'pt': 'total do ano passado',
					'nl': 'totaal afgelopen jaar',
					'fr': "total de l'année écoulée",
					'it': "totale dell'anno passato",
					'es': 'total del año pasado',
					'pl': 'łącznie ubiegły rok',
					'zh-cn': '过去一年总计'
				},
				type: 'number',
				unit: 'm3',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterStatistic.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
};
// Object all possible device commands
const DeviceParameters = {
	AvailableProfiles: {
		id: 'PRN',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Amount available profiles',
					'de': 'Anzahl verfügbarer Profile',
					'ru': 'Количество доступных профилей',
					'pt': 'Quantidade de perfis disponíveis',
					'nl': 'Aantal beschikbare profielen',
					'fr': 'Montant des profils disponibles',
					'it': 'Quantità profili disponibili',
					'es': 'Cantidad perfiles disponibles',
					'pl': 'Ilość dostępnych profili',
					'zh-cn': '可用配置文件数量'
				},
				type: 'number',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DevicePofiles.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	SelectedProfile: {
		id: 'PRF',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Selected profile number',
					'de': 'Ausgewählte Profilnummer',
					'ru': 'Выбранный номер профиля',
					'pt': 'Número do perfil selecionado',
					'nl': 'Geselecteerd profielnummer',
					'fr': 'Numéro de profil sélectionné',
					'it': 'Numero di profilo selezionato',
					'es': 'Número de perfil seleccionado',
					'pl': 'Wybrany numer profilu',
					'zh-cn': '选择的个人资料编号'
				},
				type: 'number',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DevicePofiles.path,
		levelRead: 'USER',
		levelWrite: 'USER',
		readCommand: 'get',
		writeCommand: 'set'
	},
	DeactivateConductivitySensor: {
		id: 'CSD',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Deactivate conductivity sensor',
					'de': 'Leitfähigkeitssensor deaktivieren',
					'ru': 'Отключить датчик проводимости',
					'pt': 'Desativar sensor de condutividade',
					'nl': 'Geleidbaarheidssensor deactiveren',
					'fr': 'Désactiver le capteur de conductivité',
					'it': 'Disattiva il sensore di conducibilità',
					'es': 'Desactivar sensor de conductividad',
					'pl': 'Dezaktywuj czujnik przewodności',
					'zh-cn': '停用电导率传感器'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceSettingsSensors.path,
		levelRead: 'USER',
		levelWrite: 'FACTORY',
		readCommand: 'get',
		writeCommand: 'set'
	},
	DeactivateTemperatureSensor: {
		id: 'TSD',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Deactivate temperature sensor',
					'de': 'Temperatursensor deaktivieren',
					'ru': 'Деактивировать датчик температуры',
					'pt': 'Desativar sensor de temperatura',
					'nl': 'Temperatuursensor deactiveren',
					'fr': 'Désactiver le capteur de température',
					'it': 'Disattiva il sensore di temperatura',
					'es': 'Desactivar sensor de temperatura',
					'pl': 'Dezaktywuj czujnik temperatury',
					'zh-cn': '停用温度传感器'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceSettingsSensors.path,
		levelRead: 'USER',
		levelWrite: 'FACTORY',
		readCommand: 'get',
		writeCommand: 'set'
	},
	DeactivatePressureSensor: {
		id: 'PSD',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Deactivate pressure sensor',
					'de': 'Drucksensor deaktivieren',
					'ru': 'Деактивировать датчик давления',
					'pt': 'Desativar sensor de pressão',
					'nl': 'Druksensor deactiveren',
					'fr': 'Désactiver le capteur de pression',
					'it': 'Disattiva sensore di pressione',
					'es': 'Desactivar sensor de presión',
					'pl': 'Dezaktywuj czujnik ciśnienia',
					'zh-cn': '停用压力传感器（0=激活 1=停用）'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceSettingsSensors.path,
		levelRead: 'USER',
		levelWrite: 'FACTORY',
		readCommand: 'get',
		writeCommand: 'set'
	},
	CurrentVolume: {
		id: 'AVO',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Volume of the current water consumption',
					'de': 'Volumen des aktuellen Wasserverbrauchs',
					'ru': 'Объем текущего водопотребления',
					'pt': 'Volume do consumo de água atual',
					'nl': 'Volume van het huidige waterverbruik',
					'fr': "Volume de la consommation d'eau actuelle",
					'it': 'Volume del consumo idrico attuale',
					'es': 'Volumen del consumo de agua actual',
					'pl': 'Wielkość aktualnego zużycia wody',
					'zh-cn': '当前用水量'
				},
				type: 'number',
				unit: 'ml',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterConumption.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	TotalVolume: {
		id: 'VOL',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Cumulative water volume',
					'de': 'Kumuliertes Wasservolumen',
					'ru': 'Совокупный объем воды',
					'pt': 'Volume acumulado de água',
					'nl': 'Cumulatief watervolume',
					'fr': "Volume d'eau cumulé",
					'it': "Volume d'acqua cumulativo",
					'es': 'Volumen de agua acumulado',
					'pl': 'Skumulowana objętość wody',
					'zh-cn': '累计水量'
				},
				type: 'number',
				unit: 'm3',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterConumption.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	LastTappedVolume: {
		id: 'LTV',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'last tapped water',
					'de': 'letztes gezapftes Wasser',
					'ru': 'последняя вода из-под крана',
					'pt': 'última água encanada',
					'nl': 'laatst getapt water',
					'fr': 'dernière eau du robinet',
					'it': 'ultima acqua spillata',
					'es': 'última agua del grifo',
					'pl': 'ostatnia woda z kranu',
					'zh-cn': '最后自来水'
				},
				type: 'number',
				unit: 'l',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterConumption.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	DaylightSavingTime: {
		id: 'IDS',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Daylight saving time',
					'de': 'Sommerzeit',
					'ru': 'Летнее время',
					'pt': 'Horário de verão',
					'nl': 'Zomertijd',
					'fr': "Heure d'été",
					'it': 'Ora legale',
					'es': 'Horario de verano',
					'pl': 'Czas letni',
					'zh-cn': '夏令时'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceSettings.path,
		levelRead: 'USER',
		levelWrite: 'SERVICE',
		readCommand: 'get',
		writeCommand: 'set'
	},
	PowerAdapterVoltage: {
		id: 'NET',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Power adaptor voltage',
					'de': 'Netzteilspannung',
					'ru': 'Напряжение адаптера питания',
					'pt': 'Voltagem do adaptador de energia',
					'nl': 'Spanning voedingsadapter',
					'fr': "Tension de l'adaptateur secteur",
					'it': "Tensione dell'adattatore di alimentazione",
					'es': 'Voltaje del adaptador de corriente',
					'pl': 'Napięcie zasilacza',
					'zh-cn': '电源适配器电压'
				},
				type: 'number',
				unit: 'V',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceConditions.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	BatteryVoltage: {
		id: 'BAT',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Battery voltage',
					'de': 'Batteriespannung',
					'ru': 'Напряжение батареи',
					'pt': 'Voltagem da bateria',
					'nl': 'Batterij voltage',
					'fr': 'Voltage de batterie',
					'it': 'Voltaggio batteria',
					'es': 'Voltaje de la batería',
					'pl': 'Napięcie baterii',
					'zh-cn': '电池电压'
				},
				type: 'number',
				unit: 'V',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceConditions.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	WiFiState: {
		id: 'WFS',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'WiFi state',
					'de': 'WiFi-Zustand',
					'ru': 'Состояние WiFi',
					'pt': 'Estado Wi-Fi',
					'nl': 'wifi-status',
					'fr': 'État Wi-Fi',
					'it': 'Stato Wi-Fi',
					'es': 'estado wifi',
					'pl': 'Stan Wi-Fi',
					'zh-cn': 'WiFi 状态'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceConditions.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	WiFiDeaktivate: {
		id: 'DWL',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'WiFi deactivate',
					'de': 'WLAN deaktivieren',
					'ru': 'Wi-Fi деактивировать',
					'pt': 'Desativar Wi-Fi',
					'nl': 'WiFi deactiveren',
					'fr': 'Wi-Fi désactiver',
					'it': 'Wi-Fi disattivato',
					'es': 'WiFi desactivar',
					'pl': 'Wyłącz Wi-Fi',
					'zh-cn': 'WiFi 停用'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceSettings.path,
		levelRead: 'FACTORY',
		levelWrite: 'FACTORY',
		readCommand: 'get',
		writeCommand: 'set'
	},
	APTimeout: {
		id: 'APT',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'WiFi AP timeout',
					'de': 'WLAN-AP-Zeitüberschreitung',
					'ru': 'Тайм-аут точки доступа Wi-Fi',
					'pt': 'Tempo limite do AP Wi-Fi',
					'nl': 'Time-out wifi AP',
					'fr': "Délai d'expiration du point d'accès Wi-Fi",
					'it': "Timeout dell'AP Wi-Fi",
					'es': 'Tiempo de espera de WiFi AP',
					'pl': 'Limit czasu punktu dostępu Wi-Fi',
					'zh-cn': 'WiFi AP 超时'
				},
				type: 'string',
				unit: 's',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceSettings.path,
		levelRead: 'SERVICE',
		levelWrite: 'SERVICE',
		readCommand: 'get',
		writeCommand: 'set'
	},
	APDisabled: {
		id: 'WAD',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'WiFi AP disabled',
					'de': 'WiFi-AP deaktiviert',
					'ru': 'Точка доступа Wi-Fi отключена',
					'pt': 'Wi-Fi AP desativado',
					'nl': 'WiFi AP uitgeschakeld',
					'fr': "Point d'accès Wi-Fi désactivé",
					'it': 'Punto di accesso Wi-Fi disabilitato',
					'es': 'WiFi AP deshabilitado',
					'pl': 'AP Wi-Fi wyłączony',
					'zh-cn': 'WiFi AP 已禁用'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceSettings.path,
		levelRead: 'SERVICE',
		levelWrite: 'SERVICE',
		readCommand: 'get',
		writeCommand: 'set'
	},
	APHidden: {
		id: 'WAH',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'WiFi AP hidden',
					'de': 'WiFi-AP versteckt',
					'ru': 'Точка доступа Wi-Fi скрыта',
					'pt': 'Wi-Fi AP escondido',
					'nl': 'WiFi AP verborgen',
					'fr': "Point d'accès Wi-Fi caché",
					'it': 'Punto di accesso Wi-Fi nascosto',
					'es': 'WiFi AP oculto',
					'pl': 'Ukryto punkt dostępu Wi-Fi',
					'zh-cn': 'WiFi AP隐藏'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceSettings.path,
		levelRead: 'SERVICE',
		levelWrite: 'SERVICE',
		readCommand: 'get',
		writeCommand: 'set'
	},
	NextMaintenance: {
		id: 'SRV',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Next maintenance',
					'de': 'Nächste Wartung',
					'ru': 'Следующее обслуживание',
					'pt': 'Próxima manutenção',
					'nl': 'Volgende onderhoud',
					'fr': 'Prochain entretien',
					'it': 'Prossima manutenzione',
					'es': 'Próximo mantenimiento',
					'pl': 'Następna konserwacja',
					'zh-cn': '下次维护'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceInfo.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	WiFiSSID: {
		id: 'WFC',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'WiFi SSID',
					'de': 'WLAN-SSID',
					'ru': 'WiFi SSID',
					'pt': 'Wi-Fi SSID',
					'nl': 'WiFi SSID',
					'fr': 'SSID Wi-Fi',
					'it': 'WiFi SSID',
					'es': 'Wi-Fi SSID',
					'pl': 'Wi-Fi SSID',
					'zh-cn': '无线SSID'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceSettings.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	WiFiRSSI: {
		id: 'WFR',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'WiFi RSSI',
					'de': 'WLAN-RSSI',
					'ru': 'WiFi RSSI',
					'pt': 'Wi-Fi RSSI',
					'nl': 'WiFi RSSI',
					'fr': 'RSSI Wi-Fi',
					'it': 'WiFi RSSI',
					'es': 'Wi-Fi RSSI',
					'pl': 'Wi-Fi RSSI',
					'zh-cn': '无线RSSI'
				},
				type: 'string',
				unit: '%',
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceInfo.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	CodeNumber: {
		id: 'CNO',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Code number',
					'de': 'Codenummer',
					'ru': 'Кодовое число',
					'pt': 'Número do código',
					'nl': 'Codenummer',
					'fr': 'Numéro de code',
					'it': 'Numero di codice',
					'es': 'Número de código',
					'pl': 'Numer kodu',
					'zh-cn': '代号'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceInfo.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	SerialNumber: {
		id: 'SRN',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'serial number',
					'de': 'Seriennummer',
					'ru': 'серийный номер',
					'pt': 'número de série',
					'nl': 'serienummer',
					'fr': 'numéro de série',
					'it': 'numero di serie',
					'es': 'número de serie',
					'pl': 'numer seryjny',
					'zh-cn': '序列号'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceInfo.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	DefaultGateway: {
		id: 'WGW',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'default gateway',
					'de': 'Standard-Gateway',
					'ru': 'шлюз по умолчанию',
					'pt': 'gateway padrão',
					'nl': 'standaard gateway',
					'fr': 'passerelle par défaut',
					'it': 'Gateway predefinito',
					'es': 'puerta de enlace predeterminada',
					'pl': 'Brama domyślna',
					'zh-cn': '默认网关'
				},
				type: 'string',
				unit: null,
				role: 'info.address',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceInfo.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	MACAddress: {
		id: 'MAC',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'IP address',
					'de': 'IP Adresse',
					'ru': 'айпи адрес',
					'pt': 'endereço de IP',
					'nl': 'IP adres',
					'fr': 'adresse IP',
					'it': 'indirizzo IP',
					'es': 'dirección IP',
					'pl': 'adres IP',
					'zh-cn': 'IP地址'
				},
				type: 'string',
				unit: null,
				role: 'info.mac',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceInfo.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	IPAddress: {
		id: 'WIP',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'IP address',
					'de': 'IP Adresse',
					'ru': 'айпи адрес',
					'pt': 'endereço de IP',
					'nl': 'IP adres',
					'fr': 'adresse IP',
					'it': 'indirizzo IP',
					'es': 'dirección IP',
					'pl': 'adres IP',
					'zh-cn': 'IP地址'
				},
				type: 'string',
				unit: null,
				role: 'info.ip',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceInfo.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	FirmwareVersion: {
		id: 'VER',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Firmware Version',
					'de': 'Firmware Version',
					'ru': 'Версия прошивки',
					'pt': 'Versão do firmware',
					'nl': 'Firmware versie',
					'fr': 'Version du firmware',
					'it': 'Versione del firmware',
					'es': 'Versión de firmware',
					'pl': 'Wersja oprogramowania',
					'zh-cn': '固件版本'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceInfo.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	WaterConductivity: {
		id: 'CND',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Water conductivity',
					'de': 'Wasserleitfähigkeit',
					'ru': 'Проводимость воды',
					'pt': 'Condutividade da água',
					'nl': 'Water geleidbaarheid',
					'fr': "Conductivité de l'eau",
					'it': "Conducibilità dell'acqua",
					'es': 'Conductividad del agua',
					'pl': 'Przewodność wody',
					'zh-cn': '水电导率'
				},
				type: 'number',
				unit: 'µS/cm',
				role: 'value.conductivity',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterCondition.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	WaterTemperature: {
		id: 'CEL',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Water temperature',
					'de': 'Wassertemperatur',
					'ru': 'Температура воды',
					'pt': 'Temperatura da água',
					'nl': 'Water temperatuur',
					'fr': "La température de l'eau",
					'it': "Temperatura dell'acqua",
					'es': 'Temperatura de agua',
					'pl': 'Temperatura wody',
					'zh-cn': '水温'
				},
				type: 'number',
				unit: '°C',
				role: 'value.temperature',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterCondition.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	WaterPressure: {
		id: 'BAR',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Waterr pressure',
					'de': 'Wasserdruck',
					'ru': 'Давление воды',
					'pt': 'Pressão da água',
					'nl': 'Waterdruk',
					'fr': "Pression d'eau",
					'it': "Pressione dell'acqua",
					'es': 'Presión de agua',
					'pl': 'Ciśnienie wody',
					'zh-cn': '水压'
				},
				type: 'number',
				unit: 'bar',
				role: 'value.pressure',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.WaterCondition.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	CurrentValveStatus: {
		id: 'VLV',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Current valve status',
					'de': 'Aktueller Ventilstatus',
					'ru': 'Текущее состояние клапана',
					'pt': 'Status atual da válvula',
					'nl': 'Huidige klepstatus',
					'fr': 'État actuel de la vanne',
					'it': 'Stato attuale della valvola',
					'es': 'Estado actual de la válvula',
					'pl': 'Aktualny stan zaworu',
					'zh-cn': '当前阀门状态'
				},
				type: 'string',
				unit: null,
				role: 'info.code',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceConditions.path,
		levelRead: 'SERVICE',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	CurrentAlarmStatus: {
		id: 'ALA',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'Ongoing alarm',
					'de': 'Laufender Alarm',
					'ru': 'Текущая тревога',
					'pt': 'Alarme contínuo',
					'nl': 'Lopend alarm',
					'fr': 'Alarme en cours',
					'it': 'Allarme in corso',
					'es': 'alarma en curso',
					'pl': 'Alarm w toku',
					'zh-cn': '持续警报'
				},
				type: 'string',
				unit: null,
				role: 'indicator.alarm',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceConditions.path,
		levelRead: 'USER',
		levelWrite: null,
		readCommand: 'get',
		writeCommand: null
	},
	SystemTime: {
		id: 'RTC',
		objectdefinition: {
			type: 'state',
			common: {
				name: {
					'en': 'System time',
					'de': 'Systemzeit',
					'ru': 'Системное время',
					'pt': 'Hora do sistema',
					'nl': 'Systeemtijd',
					'fr': 'Le temps du système',
					'it': 'Ora di sistema',
					'es': 'hora del sistema',
					'pl': 'czas systemu',
					'zh-cn': '系统时间'
				},
				type: 'string',
				unit: null,
				role: 'state',
				read: true,
				write: false
			},
			native: {}
		},
		statePath: adapterChannels.DeviceSettings.path,
		levelRead: 'USER',
		levelWrite: 'SERVICE',
		readCommand: 'get',
		writeCommand: 'set'
	},
};

const initStates = [
	DeviceParameters.FirmwareVersion,
	DeviceParameters.IPAddress,
	DeviceParameters.MACAddress,
	DeviceParameters.DefaultGateway,
	DeviceParameters.SerialNumber,
	DeviceParameters.CodeNumber,
	DeviceParameters.WiFiRSSI,
	DeviceParameters.WiFiSSID,
	DeviceParameters.NextMaintenance,
	DeviceParameters.APHidden,
	DeviceParameters.APDisabled,
	DeviceParameters.APTimeout,
	DeviceParameters.WiFiDeaktivate,
	DeviceParameters.WiFiState,
	DeviceParameters.BatteryVoltage,
	DeviceParameters.PowerAdapterVoltage,
	DeviceParameters.DaylightSavingTime,
	DeviceParameters.DeactivatePressureSensor,
	DeviceParameters.DeactivateConductivitySensor,
	DeviceParameters.DeactivateTemperatureSensor,
	DeviceParameters.SelectedProfile,
	DeviceParameters.AvailableProfiles];

const alarmPeriod = [DeviceParameters.CurrentAlarmStatus];

const shortPeriod = [
	DeviceParameters.WaterTemperature,
	DeviceParameters.WaterConductivity,
	DeviceParameters.WaterPressure,
	DeviceParameters.LastTappedVolume,
	DeviceParameters.TotalVolume,
	DeviceParameters.CurrentVolume];

const longPeriode = [
	DeviceParameters.CurrentValveStatus,
	DeviceParameters.SystemTime,
	DeviceParameters.FirmwareVersion,
	DeviceParameters.IPAddress,
	DeviceParameters.MACAddress,
	DeviceParameters.DefaultGateway,
	DeviceParameters.SerialNumber,
	DeviceParameters.CodeNumber,
	DeviceParameters.WiFiRSSI,
	DeviceParameters.WiFiSSID,
	DeviceParameters.NextMaintenance,
	DeviceParameters.APHidden,
	DeviceParameters.APDisabled,
	DeviceParameters.APTimeout,
	DeviceParameters.WiFiDeaktivate,
	DeviceParameters.WiFiState,
	DeviceParameters.BatteryVoltage,
	DeviceParameters.PowerAdapterVoltage,
	DeviceParameters.DaylightSavingTime];

//============================================================================
//=== Funktionen um die Antwortzeiten des HTTP Requests zu ermitteln       ===
//============================================================================
axios.interceptors.request.use(x => {
	x.meta = x.meta || {};
	x.meta.requestStartedAt = new Date().getTime();
	return x;
});

axios.interceptors.response.use(x => {
	x.responseTime = new Date().getTime() - x.config.meta.requestStartedAt;
	return x;
});
//============================================================================


// Load your modules here, e.g.:
// const fs = require("fs");

// ein Kommentar von mir

class wamo extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: adapterName,
		});

		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		/* Umrechnung in Härte
		eine Quelle besagt, dass 33µS/cm in etwa 1° deutscher Härte entspricht
		*/

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.debug('config Device IP: ' + this.config.device_ip);
		this.log.debug('config Device Port: ' + this.config.device_port);

		//=================================================================================================
		//===  Create device object and all channel objects												===
		//=================================================================================================
		try {
			await this.initDevicesAndChanels();
		} catch (err) {
			this.log.error('Error from initStatesAndChanels : ' + err);
		}
		let connTrys = 0;

		//=================================================================================================
		//===  Connecting to device																		===
		//=================================================================================================
		while (connTrys < connectionRetrys) {
			try {
				await this.deviceCommcheck(this.config.device_ip, this.config.device_port);
				device_responsive = true;
				this.log.info('Device at ' + this.config.device_ip + ':' + this.config.device_port + ' is connected');
				break;
			}
			catch (err) {
				this.log.error(String(connTrys + 1) + ' try Device at ' + this.config.device_ip + ':' + this.config.device_port + 'is not responding');
				this.log.warn('Waiting for ' + String(connectionRetryPause / 1000) + ' seconds ...');
				await sleep(connectionRetryPause);
				this.log.warn('retry connection ...');
			}
			finally {
				connTrys++;
				if (connTrys > 1) {
					this.log.warn('connection attempt No. ' + connTrys);
				}
			}
		}
		if (!device_responsive) {
			this.log.error('device NOT connected ... exit');
			// we throw an exception causing Adaper to restart
			throw 'exit not OK';
		}

		//=================================================================================================
		//===  Connection LED to Green																	===
		//=================================================================================================
		await this.setStateAsync('info.connection', { val: true, ack: true });
		this.log.debug('info.connection gesetzt');

		//=================================================================================================
		//===  Getting device data																		===
		//=================================================================================================

		// Verbindungsversuche zurücksetzen
		connTrys = 0;
		// Verbindungsbestätigung zurücksetzen
		device_responsive = false;

		while (connTrys < connectionRetrys) {
			try {
				this.log.info('Getting data from device at ' + this.config.device_ip + ':' + this.config.device_port);
				const responseInit = await this.initDevice();
				this.log.debug(`[initDevice] Response:  ${responseInit}`);
				device_responsive = true;
				break;
			}
			catch (err) {
				this.log.error(String(connTrys + 1) + ' try Device at ' + this.config.device_ip + ':' + this.config.device_port + 'is not responding');
				this.log.warn('Waiting for ' + String(connectionRetryPause / 1000) + ' seconds ...');
				await sleep(connectionRetryPause);
				this.log.warn('retry connection ...');
			}
			finally {
				connTrys++;
				if (connTrys > 1) {
					this.log.warn('connection attempt No. ' + connTrys);
				}
			}
		}
		if (!device_responsive) {
			this.log.error('device NOT connected ... exit');
			// we throw an exception causing Adaper to restart
			throw 'exit not OK';
		}

		//=================================================================================================
		//===  Getting device Profiles data																===
		//=================================================================================================

		// Verbindungsversuche zurücksetzen
		connTrys = 0;
		// Verbindungsbestätigung zurücksetzen
		device_responsive = false;

		while (connTrys < connectionRetrys) {
			try {
				// Device Profiles Initialisation
				this.log.info('Getting Profiles data from device at ' + this.config.device_ip + ':' + this.config.device_port);
				const responseInitProfiles = await this.initDeviceProfiles(this.config.device_ip, this.config.device_port);
				this.log.debug(`[initDeviceProfiles] Response:  ${responseInitProfiles}`);
				device_responsive = true;
				break;
			}
			catch (err) {
				this.log.error(String(connTrys + 1) + ' try / Device at ' + this.config.device_ip + ':' + this.config.device_port + 'is not responding');
				this.log.warn('Waiting for ' + String(connectionRetryPause / 1000) + ' seconds ...');
				await sleep(connectionRetryPause);
				this.log.warn('retry connection ...');
			}
			finally {
				connTrys++;
				if (connTrys > 1) {
					this.log.warn('connection attempt No. ' + connTrys);
				}
			}
		}
		if (!device_responsive) {
			this.log.error('device NOT connected ... exit');
			// we throw an exception causing Adaper to restart
			throw 'exit not OK';
		}

		//=================================================================================================
		//===  Timer starten																			===
		//=================================================================================================
		try {
			const tmstarted = await this.timerStarts();
			this.log.debug('Timers started - Result: ' + String(tmstarted));
		} catch (err) {
			this.log.error('device Timer start Error ... exit');
			// we throw an exception causing Adaper to restart
			throw err;
		}

		/*
		// ==================================================================================================================
		// =======                                 TESTING															  =======
		// ==================================================================================================================
		this.log.debug('Neue update Funktion Testen');
		try {
			await this.updateState(DeviceParameters.TestDefinition, 224);
		}
		catch (err) {
			this.log.error(`[updateState(DeviceParameters.TestDefinition, '224')] error: ${err}`);
		}
		// ==================================================================================================================
		*/

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*//*
		await this.setObjectNotExistsAsync('testVariable', {
			type: 'state',
			common: {
				name: 'testVariable',
				type: 'boolean',
				role: 'indicator',
				read: true,
				write: true,
			},
			native: {},
		});
		*/

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		// this.subscribeStates('info.connection');
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates('lights.*');
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates('*');

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		//await this.setStateAsync('testVariable', true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		//await this.setStateAsync('testVariable', { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		//await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync('admin', 'iobroker');
		this.log.debug('check user admin pw iobroker: ' + result);

		result = await this.checkGroupAsync('admin', 'admin');
		this.log.debug('check group user admin group admin: ' + result);

		// reference to Adapter
		myAdapter = this;

		this.log.info('Adapter wurde gestartet');

	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			schedule.gracefulShutdown();
		} catch (err) {
			this.log.error('Disable Cron Jobs' + err);
		}

		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...

			clearInterval(alarm_Intervall_ID);
			clearInterval(short_Intervall_ID);
			clearInterval(long_Intervall_ID);
			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }


	//===================================================
	// Timer Starten
	async timerStarts() {
		return new Promise(async (resolve, reject) => {
			try {
				schedule.scheduleJob(cron_Day, cron_poll_day);
				schedule.scheduleJob(cron_Week, cron_poll_week);
				schedule.scheduleJob(cron_Month, cron_poll_month);
				schedule.scheduleJob(cron_Year, cron_poll_year);
				this.log.info('Cron Timer Started');
			} catch (err) {
				this.log.error('Cron Start Error: ' + err);
			}
			try {

				// Die Timer für das Polling starten
				alarm_Intervall_ID = this.setInterval(alarm_poll, parseInt(this.config.device_alarm_poll_interval) * 1000);
				this.log.info('Alarm timer initialized');
				await sleep(5000); // Warten um einen Versatz zu erzeugen
				short_Intervall_ID = this.setInterval(short_poll, parseInt(this.config.device_short_poll_interval) * 1000);
				this.log.info('Short timer initialized');
				await sleep(5000); // Warten um einen Versatz zu erzeugen
				long_Intervall_ID = this.setInterval(long_poll, parseInt(this.config.device_long_poll_interval) * 1000);
				this.log.info('Long timer initialized');
				resolve('Alarm Timer ID=' + alarm_Intervall_ID + ' / Short Timer ID=' + short_Intervall_ID + ' / Long Timer ID=' + long_Intervall_ID);
			} catch (err) {
				reject(err);
			}
		});
	}

	//===================================================
	// Cron EVENTS
	async alarm_cron_day_Tick() {
		return new Promise(async (resolve, reject) => {
			try {
				this.log.debug('Cron day tick');

				// ================================================
				// Dayly sum reset
				// ================================================
				// here we save the sumary and the we reset it to 0
				// ================================================

				// getting saved Total state
				const TotalDayState = await this.getStateAsync(StatisticStates.TotalDay.statePath + '.' + StatisticStates.TotalDay.id);

				// saving sum to "past" State
				await this.setObjectNotExistsAsync(StatisticStates.TotalPastDay.statePath + '.' + StatisticStates.TotalPastDay.id, StatisticStates.TotalPastDay.objectdefinition);
				await this.setStateAsync(StatisticStates.TotalPastDay.statePath + '.' + StatisticStates.TotalPastDay.id, { val: parseFloat(TotalDayState.val), ack: true });

				// resetting sum to 0
				await this.setObjectNotExistsAsync(StatisticStates.TotalDay.statePath + '.' + StatisticStates.TotalDay.id, StatisticStates.TotalDay.objectdefinition);
				await this.setStateAsync(StatisticStates.TotalDay.statePath + '.' + StatisticStates.TotalDay.id, { val: 0, ack: true });

				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async alarm_cron_week_Tick() {
		return new Promise(async (resolve, reject) => {
			try {
				this.log.warn('Cron week tick');

				// ================================================
				// Week sum reset
				// ================================================
				// here we save the sumary and the we reset it to 0
				// ================================================

				// getting saved Total state
				const TotalWeekState = await this.getStateAsync(StatisticStates.TotalWeek.statePath + '.' + StatisticStates.TotalWeek.id);

				// saving sum to "past" State
				await this.setObjectNotExistsAsync(StatisticStates.TotalPastWeek.statePath + '.' + StatisticStates.TotalPastWeek.id, StatisticStates.TotalPastWeek.objectdefinition);
				await this.setStateAsync(StatisticStates.TotalPastWeek.statePath + '.' + StatisticStates.TotalPastWeek.id, { val: parseFloat(TotalWeekState.val), ack: true });

				// resetting sum to 0
				await this.setObjectNotExistsAsync(StatisticStates.TotalWeek.statePath + '.' + StatisticStates.TotalWeek.id, StatisticStates.TotalWeek.objectdefinition);
				await this.setStateAsync(StatisticStates.TotalWeek.statePath + '.' + StatisticStates.TotalWeek.id, { val: 0, ack: true });

				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async alarm_cron_month_Tick() {
		return new Promise(async (resolve, reject) => {
			try {
				this.log.warn('Cron month tick');

				// ================================================
				// Month sum reset
				// ================================================
				// here we save the sumary and the we reset it to 0
				// ================================================

				// getting saved Total state
				const TotalMonthState = await this.getStateAsync(StatisticStates.TotalMonth.statePath + '.' + StatisticStates.TotalMonth.id);

				// saving sum to "past" State
				await this.setObjectNotExistsAsync(StatisticStates.TotalPastMonth.statePath + '.' + StatisticStates.TotalPastMonth.id, StatisticStates.TotalPastMonth.objectdefinition);
				await this.setStateAsync(StatisticStates.TotalPastMonth.statePath + '.' + StatisticStates.TotalPastMonth.id, { val: parseFloat(TotalMonthState.val), ack: true });

				// resetting sum to 0
				await this.setObjectNotExistsAsync(StatisticStates.TotalMonth.statePath + '.' + StatisticStates.TotalMonth.id, StatisticStates.TotalMonth.objectdefinition);
				await this.setStateAsync(StatisticStates.TotalMonth.statePath + '.' + StatisticStates.TotalMonth.id, { val: 0, ack: true });

				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async alarm_cron_year_Tick() {
		return new Promise(async (resolve, reject) => {
			try {
				this.log.warn('Cron year tick');

				// ================================================
				// Year sum reset
				// ================================================
				// here we save the sumary and the we reset it to 0
				// ================================================

				// getting saved Total state
				const TotalYearState = await this.getStateAsync(StatisticStates.TotalYear.statePath + '.' + StatisticStates.TotalYear.id);

				// saving sum to "past" State
				await this.setObjectNotExistsAsync(StatisticStates.TotalPastYear.statePath + '.' + StatisticStates.TotalPastYear.id, StatisticStates.TotalPastYear.objectdefinition);
				await this.setStateAsync(StatisticStates.TotalPastYear.statePath + '.' + StatisticStates.TotalPastYear.id, { val: parseFloat(TotalYearState.val), ack: true });

				// resetting sum to 0
				await this.setObjectNotExistsAsync(StatisticStates.TotalYear.statePath + '.' + StatisticStates.TotalYear.id, StatisticStates.TotalYear.objectdefinition);
				await this.setStateAsync(StatisticStates.TotalYear.statePath + '.' + StatisticStates.TotalYear.id, { val: 0, ack: true });

				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	//===================================================
	// Timer EVENTS
	async alarm_TimerTick() {
		return new Promise(async (resolve, reject) => {
			try {
				this.log.debug('Alarm Timer tick');
				// get alarmPeriode data
				await this.getData(alarmPeriod);
				resolve(true);
			} catch (err) {
				interfaceBussy = false;	// CLEAR flag that device interface is bussy
				reject(err);
			}
		});
	}

	async short_TimerTick() {
		return new Promise(async (resolve, reject) => {
			try {
				this.log.debug('Short Timer tick');
				// get longPeriode data
				await this.getData(shortPeriod);

				try {
					await this.updateStatistics();
				} catch (err) {
					this.log.error('Statistics Error: ' + err);
				}
				resolve(true);
			} catch (err) {
				interfaceBussy = false;	// CLEAR flag that device interface is bussy
				reject(err);
			}
		});
	}

	async long_TimerTick() {
		return new Promise(async (resolve, reject) => {
			try {
				this.log.debug('Long Timer tick');
				// get longPeriode data
				await this.getData(longPeriode);
				resolve(true);
			} catch (err) {
				interfaceBussy = false;	// CLEAR flag that device interface is bussy
				reject(err);
			}
		});
	}

	async getData(statesToGet) {
		return new Promise(async (resolve, reject) => {
			try {
				for (let i = 0; i < statesToGet.length; i++) {
					if (!interfaceBussy) {
						// Verbindungsversuche zurücksetzen
						let connTrys = 0;
						// Verbindungsbestätigung zurücksetzen
						device_responsive = false;

						while (connTrys < connectionRetrys) {
							try {
								interfaceBussy = true;	// SET flag that device interface is bussy
								await this.updateState(statesToGet[i], await this.get_DevieParameter(statesToGet[i].id, this.config.device_ip, this.config.device_port));
								// await this.updateState(DeviceParameters.CurrentValveStatus, await this.get_DevieParameter(DeviceParameters.CurrentValveStatus.id, this.config.device_ip, this.config.device_port));
								interfaceBussy = false;	// CLEAR flag that device interface is bussy
								device_responsive = true;
								break;
							}
							catch (err) {
								this.log.error('[async getData(statesToGet)] ' + String(connTrys + 1) + ' try / Device at ' + this.config.device_ip + ':' + this.config.device_port + 'is not responding');
								this.log.warn('Waiting for ' + String(connectionRetryPause / 1000) + ' seconds ...');
								await sleep(connectionRetryPause);
								this.log.warn('retry connection ...');
							}
							finally {
								connTrys++;
								if (connTrys > 1) {
									interfaceBussy = false;	// CLEAR flag that device interface is bussy
									this.log.warn('connection attempt No. ' + connTrys);
								}
							}
						}

						if (!device_responsive) {
							this.log.error('device NOT reachable');
							// we throw an exception causing Adaper to restart
							interfaceBussy = false;	// CLEAR flag that device interface is bussy
						}
					}
					else {
						this.log.warn('[async getData(statesToGet)] Device interface is bussy!');
					}
				}
				resolve(true);
			} catch (err) {
				interfaceBussy = false;	// CLEAR flag that device interface is bussy
				reject(err);
			}
		});
	}

	//===================================================
	// reading ALA (Alarm) status from device to test if the device is present and responding
	async deviceCommcheck(DeviceIP, DevicePort) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.get_DevieParameter('ALA', DeviceIP, DevicePort);
				resolve(true);
			} catch (err) {
				this.log.warn('[async deviceCommcheck(DeviceIP, DevicePort)] Error:');
				reject(false);
			}
		});

	}

	//===================================================
	// Creating device object and all channel objects
	async initDevicesAndChanels() {
		return new Promise(async (resolve, reject) => {
			try {
				try {
					await this.setObjectNotExistsAsync('Device', {
						type: 'device',
						common: {
							name: 'Device'
						},
						native: {}
					});
					this.log.debug('[async initDevicesAndChanels()] Device object created');
				} catch (err) {
					this.log.error('[async initDevicesAndChanels()] ERROR Device: ]' + err);
				}

				for (const key in adapterChannels) {
					try {
						await this.setObjectNotExistsAsync(String(adapterChannels[key].path), adapterChannels[key].channel);
						this.log.debug('Channel ' + String(adapterChannels[key].path) + ' created');
					} catch (err) {
						this.log.error('[async initDevicesAndChanels()] ERROR Channel: ]' + err);
					}
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	//===================================================
	// Divice Initialisation (called on Adapter Start)
	async initDevice() {
		return new Promise(async (resolve, reject) => {
			try {
				this.log.debug('Long Timer tick');
				// get longPeriode data
				await this.getData(initStates);
				resolve(true);
			} catch (err) {
				interfaceBussy = false;	// CLEAR flag that device interface is bussy
				reject(err);
			}
		});
	}

	async initDeviceProfiles(DeviceIP, DevicePort,) {
		return new Promise(async (resolve, reject) => {
			try {

				// alle 8 möglichen Profile durchlaufen
				for (let ProfileNumber = 1; ProfileNumber < 9; ProfileNumber++) {

					this.log.debug('[async initDeviceProfiles(DeviceIP, DevicePort)] Profil ' + ProfileNumber);

					const listOfParameter = [
						'Device.Profiles.' + String(ProfileNumber) + '.PA' + String(ProfileNumber),
						'Device.Profiles.' + String(ProfileNumber) + '.PN' + String(ProfileNumber),
						'Device.Profiles.' + String(ProfileNumber) + '.PV' + String(ProfileNumber),
						'Device.Profiles.' + String(ProfileNumber) + '.PT' + String(ProfileNumber),
						'Device.Profiles.' + String(ProfileNumber) + '.PF' + String(ProfileNumber),
						'Device.Profiles.' + String(ProfileNumber) + '.PM' + String(ProfileNumber),
						'Device.Profiles.' + String(ProfileNumber) + '.PR' + String(ProfileNumber),
						'Device.Profiles.' + String(ProfileNumber) + '.PB' + String(ProfileNumber),
						'Device.Profiles.' + String(ProfileNumber) + '.PW' + String(ProfileNumber)];

					this.log.debug(`[initDeviceProfiles()] Profil ` + ProfileNumber);
					for (const stateID of listOfParameter) {
						const parameterIDs = stateID.split('.');
						this.log.debug('current Parameter ID: ' + parameterIDs[parameterIDs.length - 1]);
						const result = await this.get_DevieProfileParameter(ProfileNumber, parameterIDs[parameterIDs.length - 1], DeviceIP, DevicePort);
						this.log.debug('[' + parameterIDs[parameterIDs.length - 1] + '] : ' + String(JSON.stringify(result)));
						await this.UpdateProfileState(ProfileNumber, stateID, result);
						this.log.debug('Profil ' + ProfileNumber + ' Parameter ' + parameterIDs[parameterIDs.length - 1]);
					}
				}
				resolve(true);
			} catch (err) {
				this.log.error(err.message);
				reject(err);
			}
		});
	}
	//===================================================

	//===================================================
	// Alarm Timer: Get Values  (called on each Alarm Timer Tick)

	async get_AlarmTimerValues(DeviceIP, DevicePort) {
		return new Promise(async (resolve, reject) => {
			try {
				if (false) {

					const listOfParameter = [
						'Conditions.ALA'];

					this.log.debug(`[get_AlarmTimerValues(DeviceIP, DevicePort)]`);
					let result;
					for (const stateID of listOfParameter) {
						const parameterIDs = stateID.split('.');
						this.log.debug('current Parameter ID: ' + parameterIDs[parameterIDs.length - 1]);
						result = await this.get_DevieParameter(parameterIDs[parameterIDs.length - 1], DeviceIP, DevicePort);
						this.log.debug('[' + parameterIDs[parameterIDs.length - 1] + '] : ' + String(JSON.stringify(result)));
						await this.UpdateState(stateID, result);
					}
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}
	//===================================================

	//===================================================
	// Short Timer: Get Values  (called on each short Timer Tick)
	async get_ShortTimerValues(DeviceIP, DevicePort) {
		return new Promise(async (resolve, reject) => {
			try {
				if (false) {
					const listOfParameter = [
						'Conditions.CEL',	// Water temperatur
						'Conditions.CND',	// Water conductivity
						'Device.Info.BAT',
						'Consumptions.AVO',
						'Consumptions.LTV',
						'Consumptions.VOL',
						'Device.Info.NET'];

					this.log.debug(`[get_ShortTimerValues(DeviceIP, DevicePort)]`);
					let result;
					for (const stateID of listOfParameter) {
						const parameterIDs = stateID.split('.');
						this.log.debug('current Parameter ID: ' + parameterIDs[parameterIDs.length - 1]);
						result = await this.get_DevieParameter(parameterIDs[parameterIDs.length - 1], DeviceIP, DevicePort);
						this.log.debug('[' + parameterIDs[parameterIDs.length - 1] + '] : ' + String(JSON.stringify(result)));
						await this.UpdateState(stateID, result);
					}
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}
	//===================================================

	//===================================================
	// Sets the Adapter State Objects
	// stateID: object path
	// value:	Value for Object
	async UpdateState(stateID, value) {
		return new Promise(async (resolve, reject) => {

			// Parameter ID aus stateID ermitteln
			const parameterIDs = stateID.split('.');
			const parameter = (parameterIDs[parameterIDs.length - 1]).substr(0, parameterIDs[parameterIDs.length - 1].length);
			this.log.debug('[UpdateState(stateID, value)] Parameter = ' + String(parameter));
			try {
				switch (parameter) {
					case 'VER':
						await this.state_VER(value);
						break;
					case 'WIP':
						await this.state_WIP(value);
						break;
					case 'MAC':
						await this.state_MAC(value);
						break;
					case 'WGW':
						await this.state_WGW(value);
						break;
					case 'SRN':
						await this.state_SRN(value);
						break;
					case 'CNO':
						await this.state_CNO(value);
						break;
					case 'WFR':
						await this.state_WFR(value);
						break;
					case 'WFC':
						await this.state_WFC(value);
						break;
					case 'SRV':
						await this.state_SRV(value);
						break;
					case 'WAH':
						await this.state_WAH(value);
						break;
					case 'WAD':
						await this.state_WAD(value);
						break;
					case 'APT':
						await this.state_APT(value);
						break;
					case 'DWL':
						await this.state_DWL(value);
						break;
					case 'WFS':
						await this.state_WFS(value);
						break;
					case 'BAT':
						await this.state_BAT(value);
						break;
					case 'IDS':
						await this.state_IDS(value);
						break;
					case 'ALA':
						await this.state_ALA(value);
						break;
					case 'AVO':
						await this.state_AVO(value);
						break;
					case 'LTV':
						await this.state_LTV(value);
						break;
					case 'VOL':
						await this.state_VOL(value);
						break;
					case 'NET':
						await this.state_NET(value);
						break;
					case 'CEL':
						await this.state_CEL(value);
						break;
					case 'CND':
						await this.state_CND(value);
						break;
				}

				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	//=============================================================================
	// Diese Funktion speichert das übergebene'vValue' im entsprechenden State
	// der in 'stateID' übergebenen Struktur
	//=============================================================================
	async updateState(stateID, value) {
		return new Promise(async (resolve, reject) => {
			try {

				let cur_ParameterID;	// Parameter ID
				let cur_StatePath;		// State Path

				// Parameter ID ermitteln, wenn nciht vorhanden, Error auslösen und abbrechen
				if (stateID == null) { throw '[async updateState(stateID, value)] stateID is null'; }


				if ('id' in stateID) {
					if (stateID.id == null || stateID.id == '') { throw String(stateID) + ' [async updateState(stateID, value)] has no valid [id] key (null or empty)'; }
					cur_ParameterID = stateID.id;
					this.log.debug('id key Value is: ' + cur_ParameterID);
				} else {
					throw String(stateID) + ' [async updateState(stateID, value)] has no [id] key';
				}

				// Den Pafad des States ermittlen -> wenn nicht vorhanden, Error auslösen und abbrechen
				if ('statePath' in stateID) {
					if (stateID.statePath == null || stateID.statePath == '') { throw String(stateID) + ' [async updateState(stateID, value)] has no valid (statePath) key'; }
					cur_StatePath = stateID.statePath;
					this.log.debug('(statePath) key Value is: ' + cur_StatePath);
				} else {
					throw String(stateID) + ' [async updateState(stateID, value)] has no id statePath';
				}

				const state_ID = cur_StatePath + '.' + cur_ParameterID;

				let skipp = false;

				if(cur_ParameterID === DeviceParameters.WaterConductivity.id && sensor_conductivity_present === false){skipp = true;}
				else if(cur_ParameterID === DeviceParameters.WaterPressure.id && sensor_pressure_present === false){skipp = true;}
				else if(cur_ParameterID === DeviceParameters.WaterTemperature.id && sensor_temperature_present === false){skipp = true;}

				if(skipp){
					this.log.debug('Sensor not Present ... skipped');
					resolve(true);
					return;
				}

				await this.setObjectNotExistsAsync(state_ID, stateID.objectdefinition);
				this.log.debug('stateID.objectdefinition.common.type = ' + stateID.objectdefinition.common.type);

				// convert into final value
				let finalValue;
				try {
					finalValue = await this.convertDeviceReturnValue(stateID.id, value['get' + stateID.id]);
					this.log.debug('finalValue = ' + String(finalValue));
				}
				catch (err) {
					this.log.error('[async updateState(stateID, value)] Error: ' + String(err));
					reject(err);
				}

				switch (stateID.objectdefinition.common.type) {
					case 'number':
						this.log.debug('[async updateState(stateID, value)] value is NUMBER');
						this.setStateAsync(state_ID, { val: parseFloat(String(finalValue)), ack: true });
						break;
					default:
						// handle as string
						this.log.debug('[async updateState(stateID, value)] value is STRING');
						this.setStateAsync(state_ID, { val: String(finalValue), ack: true });
				}

				if (stateID.objectdefinition.common.unit !== null) {
					this.log.info('[async updateState(stateID, value)] info: ' + String(cur_StatePath) + ' ' + String(cur_ParameterID) + ' ' + String(finalValue) + ' ' + String(stateID.objectdefinition.common.unit));
				}
				else {
					this.log.info('[async updateState(stateID, value)] info: ' + String(cur_StatePath) + ' ' + String(cur_ParameterID) + ' ' + String(finalValue));
				}
				resolve(true);
			} catch (err) {
				this.log.error('[async updateState(stateID, value)] Error: ' + String(err));
				reject(err);
			}
		});
	}

	//================================================================================
	// here we convert the raw values from the device into final values for the states
	//================================================================================
	async convertDeviceReturnValue(valueKey, value) {
		return new Promise((resolve, reject) => {
			try {
				let finalValue;
				switch (String(valueKey)) {
					case DeviceParameters.AvailableProfiles.id: // PRN - available profiles
						finalValue = parseInt(value);
						break;
					case DeviceParameters.SelectedProfile.id: // PRF - selected profile
						finalValue = parseInt(value);
						break;
					case 'TSD':	// Temp sensor present
						if (parseInt(value) == 0) {
							sensor_temperature_present = true;
							finalValue = 'Sensor active';
							this.log.info('Temperatur sensor Present');
						} else {
							sensor_temperature_present = false;
							finalValue = 'Sensor deactivated';
							this.log.warn('Temperatur sensor not Present');
						}
						break;
					case 'CSD':	// conductivity sensor present
						if (parseInt(value) == 0) {
							sensor_conductivity_present = true;
							finalValue = 'Sensor active';
							this.log.info('Conductivity sensor Present');
						} else {
							sensor_conductivity_present = false;
							finalValue = 'Sensor deactivated';
							this.log.warn('Conductivity sensor not Present');
						}
						break;
					case 'PSD':	// Pressure sensor present
						if (parseInt(value) == 0) {
							sensor_pressure_present = true;
							finalValue = 'Sensor active';
							this.log.info('Pressure sensor Present');
						} else {
							sensor_pressure_present = false;
							finalValue = 'Sensor deactivated';
							this.log.warn('Pressure sensor not Present');
						}
						break;
					case 'ALA':	// Alarm status
						switch (String(value)) {
							case 'FF':
								finalValue = 'NO ALARM';
								break;
							case 'A1':
								finalValue = 'ALARM END SWITCH';
								break;
							case 'A2':
								finalValue = 'NO NETWORK';
								break;
							case 'A3':
								finalValue = 'ALARM VOLUME LEAKAGE';
								break;
							case 'A4':
								finalValue = 'ALARM TIME LEAKAGE';
								break;
							case 'A5':
								finalValue = 'ALARM MAX FLOW LEAKAGE';
								break;
							case 'A6':
								finalValue = 'ALARM MICRO LEAKAGE';
								break;
							case 'A7':
								finalValue = 'ALARM EXT. SENSOR LEAKAGE';
								break;
							case 'A8':
								finalValue = 'ALARM TURBINE BLOCKED';
								break;
							case 'A9':
								finalValue = 'ALARM PRESSURE SENSOR ERROR';
								break;
							case 'AA':
								finalValue = 'ALARM TEMPERATURE SENSOR ERROR';
								break;
							case 'AB':
								finalValue = 'ALARM CONDUCTIVITY SENSOR ERROR';
								break;
							case 'AC':
								finalValue = 'ALARM TO HIGH CONDUCTIVITY';
								break;
							case 'AD':
								finalValue = 'LOW BATTERY';
								break;
							case 'AE':
								finalValue = 'WARNING VOLUME LEAKAGE';
								break;
							case 'AF':
								finalValue = 'ALARM NO POWER SUPPLY';
								break;
							default:
								finalValue = 'undefined';
						}
						break;
					case 'VLV':	// Current Valve Status
						switch (String(value)) {
							case '10':
								finalValue = 'Closed';
								break;
							case '11':
								finalValue = 'Closing';
								break;
							case '20':
								finalValue = 'Open';
								break;
							case '21':
								finalValue = 'Opening';
								break;
							case '30':
								finalValue = 'Undefined';
								break;
							default:
								this.log.warn('[async convertDeviceReturnValue(valueKey, value)] Value (' + String(value) + ') for Key (' + String(valueKey) + ') is not defined!');
								finalValue = null;
						}
						break;
					case 'RTC':	// System Time
						finalValue = (new Date(parseInt(value) * 1000)).toLocaleString();
						//finalValue = (new Date(parseInt(value) * 1000)).toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);
						break;
					case 'CEL': // Water temperature
						finalValue = parseFloat(value) / 10;
						break;
					case 'BAR': // Water pressure
						if (sensor_pressure_present) {
							finalValue = parseFloat(String(value).replace(',', '.'));
						}
						break;
					case 'CND': // Water conductivity
						if (sensor_conductivity_present) {
							finalValue = parseFloat(String(value).replace(',', '.'));
						}
						break;
					case 'BAT':	// Batterie voltage
						if (sensor_temperature_present) {
							finalValue = parseFloat(String(value).replace(',', '.'));
						}
						break;
					case 'NET':	// DC voltage (power adaptor)
					case 'LTV':	// Last tapped Volume
						finalValue = parseFloat(String(value).replace(',', '.'));
						break;
					case 'VOL':
						finalValue = parseFloat(String(value).replace(',', '.').replace('Vol[L]', '')) / 1000;
						break;
					case 'AVO':
						finalValue = parseFloat(String(value).replace(',', '.').replace('mL', ''));
						break;
					case 'WAH':	// WiFi AP hidden
						if (parseInt(value) == 0) {
							finalValue = 'AP not hidden (visible)';
						} else {
							finalValue = 'AP hidden';
						}
						break;
					case 'WAD':	// WiFi AP dissabled
						if (parseInt(value) == 0) {
							finalValue = 'AP not disabled';
						} else {
							finalValue = 'AP disabled';
						}
						break;
					case 'APT':	// WiFi AP timeout
						if (parseInt(value) == 0) {
							finalValue = 'AP timeout not active';
						} else {
							finalValue = 'AP disabled after ' + String(value) + ' seconds after internet connection';
						}
						break;
					case 'DWL':	// WiFi deactivated
						if (parseInt(value) == 0) {
							finalValue = 'active (default)';
						} else {
							finalValue = 'deactivated';
						}
						break;
					case 'WFS':	// WiFi state
						if (parseInt(value) == 0) {
							finalValue = 'Disconnected';
						} else if (parseInt(value) == 1) {
							finalValue = 'Connecting';
						} else if (parseInt(value) == 2) {
							finalValue = 'Connected';
						} else {
							finalValue = 'undefined';
						}
						break;
					case 'IDS':	// Daylight saving time
						if (parseInt(value) == 0) {
							finalValue = 'Disabled';
						} else {
							finalValue = 'Enabled';
						}
						break;
					case 'VER':	// Firmware Version
					case 'WIP': // IP address
					case 'MAC':	// MAC address
					case 'WGW':	// Default gateway
					case 'SRN':	// Device serial number
					case 'CNO':	// Code Number
					case 'WFR':	// WiFi RSSI
					case 'WFC':	// WiFi SSID
					case 'SRV':	// Next Maintenance
						finalValue = value;
						break;
					default:
						this.log.warn('[async convertDeviceReturnValue(valueKey, value)] Key (' + String(valueKey) + ') is not valid!');
						finalValue = value;
				}
				resolve(finalValue);
			} catch (err) {
				reject(err);
			}
		});
	}

	//=============================================================================
	// here we do a part of the math for the statistics
	//=============================================================================
	async updateStatistics() {
		return new Promise(async (resolve, reject) => {
			try {
				this.log.debug('update Statistics');

				let lastTotalValue = 0;
				let currentTotalValue = 0;
				let deltaValue = 0;
				let current_Day = 0;
				let current_Week = 0;
				let current_Month = 0;
				let current_Year = 0;

				// getting states
				const lastTotalvalueState = await this.getStateAsync(StatisticStates.TotalLastValue.statePath + '.' + StatisticStates.TotalLastValue.id);
				const currentTotalvalueState = await this.getStateAsync(DeviceParameters.TotalVolume.statePath + '.' + DeviceParameters.TotalVolume.id);
				const current_Day_valueState = await this.getStateAsync(StatisticStates.TotalDay.statePath + '.' + StatisticStates.TotalDay.id);
				const current_Week_valueState = await this.getStateAsync(StatisticStates.TotalWeek.statePath + '.' + StatisticStates.TotalWeek.id);
				const current_Month_valueState = await this.getStateAsync(StatisticStates.TotalMonth.statePath + '.' + StatisticStates.TotalMonth.id);
				const current_Year_valueState = await this.getStateAsync(StatisticStates.TotalYear.statePath + '.' + StatisticStates.TotalYear.id);

				// pulling values from states if state already existed
				if (lastTotalvalueState !== null) { lastTotalValue = parseFloat(lastTotalvalueState.val); }
				if (currentTotalvalueState !== null) { currentTotalValue = parseFloat(currentTotalvalueState.val) * 1000; }
				if (current_Day_valueState !== null) { current_Day = parseFloat(current_Day_valueState.val); }
				if (current_Week_valueState !== null) { current_Week = parseFloat(current_Week_valueState.val); }
				if (current_Month_valueState !== null) { current_Month = parseFloat(current_Month_valueState.val); }
				if (current_Year_valueState !== null) { current_Year = parseFloat(current_Year_valueState.val); }

				// calculating the delta
				deltaValue = currentTotalValue - lastTotalValue;
				this.log.debug('old total = ' + String(lastTotalValue) + 'l / akt total = ' + String(currentTotalValue) + 'l / Delta = ' + String(deltaValue) + 'l');

				// only update states if we hav a change in total consumption
				if (deltaValue > 0) {
					// adding delta to states
					current_Day += deltaValue;
					current_Week += deltaValue;
					current_Month += deltaValue;
					current_Year += (deltaValue / 1000);

					// saving states
					// new last total
					await this.setObjectNotExistsAsync(StatisticStates.TotalLastValue.statePath + '.' + StatisticStates.TotalLastValue.id, StatisticStates.TotalLastValue.objectdefinition);
					await this.setStateAsync(StatisticStates.TotalLastValue.statePath + '.' + StatisticStates.TotalLastValue.id, { val: currentTotalValue, ack: true });

					// new day total
					await this.setObjectNotExistsAsync(StatisticStates.TotalDay.statePath + '.' + StatisticStates.TotalDay.id, StatisticStates.TotalDay.objectdefinition);
					await this.setStateAsync(StatisticStates.TotalDay.statePath + '.' + StatisticStates.TotalDay.id, { val: current_Day, ack: true });

					// new week total
					await this.setObjectNotExistsAsync(StatisticStates.TotalWeek.statePath + '.' + StatisticStates.TotalWeek.id, StatisticStates.TotalWeek.objectdefinition);
					await this.setStateAsync(StatisticStates.TotalWeek.statePath + '.' + StatisticStates.TotalWeek.id, { val: current_Week, ack: true });

					// new month total
					await this.setObjectNotExistsAsync(StatisticStates.TotalMonth.statePath + '.' + StatisticStates.TotalMonth.id, StatisticStates.TotalMonth.objectdefinition);
					await this.setStateAsync(StatisticStates.TotalMonth.statePath + '.' + StatisticStates.TotalMonth.id, { val: current_Month, ack: true });

					// new year total
					await this.setObjectNotExistsAsync(StatisticStates.TotalYear.statePath + '.' + StatisticStates.TotalYear.id, StatisticStates.TotalYear.objectdefinition);
					await this.setStateAsync(StatisticStates.TotalYear.statePath + '.' + StatisticStates.TotalYear.id, { val: current_Year, ack: true });
				}

				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async UpdateProfileState(ProfileNumber, stateID, value) {
		return new Promise(async (resolve, reject) => {

			const parameterIDs = stateID.split('.');
			const parameter = (parameterIDs[parameterIDs.length - 1]).substr(0, parameterIDs[parameterIDs.length - 1].length - 1);
			this.log.debug('[UpdateProfileState(ProfileNumber, stateID, value)] Profilparameter =' + parameter);
			try {
				switch (parameter) {
					case 'PA':
						await this.state_profile_PA(ProfileNumber, value);
						break;
					case 'PN':
						await this.state_profile_PN(ProfileNumber, value);
						break;
					case 'PV':
						await this.state_profile_PV(ProfileNumber, value);
						break;
					case 'PT':
						await this.state_profile_PT(ProfileNumber, value);
						break;
					case 'PF':
						await this.state_profile_PF(ProfileNumber, value);
						break;
					case 'PM':
						await this.state_profile_PM(ProfileNumber, value);
						break;
					case 'PR':
						await this.state_profile_PR(ProfileNumber, value);
						break;
					case 'PB':
						await this.state_profile_PB(ProfileNumber, value);
						break;
					case 'PW':
						await this.state_profile_PW(ProfileNumber, value);
						break;
					default:
				}

				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	//===================================================
	// Pulls the Information from the Device
	// ParameterID: API command Parameter (last instance of the State path)
	// IPadress: Device IP Adress
	// Port: Device Port
	//===================================================
	// Return: Readed Value from Device (JSON Format)
	async get_DevieParameter(ParameterID, IPadress, Port) {
		return new Promise(async (resolve, reject) => {

			this.log.debug(`[getDevieParameter(ParameterID)] ${ParameterID}`);

			axios({
				method: 'get', url: 'Http://' + String(IPadress) + ':' + String(Port) + '/safe-tec/get/' + String(ParameterID), timeout: 10000, responseType: 'json'
			}
			).then(async (response) => {
				const content = response.data;
				this.log.debug(`[getSensorData] local request done after ${response.responseTime / 1000}s - received data (${response.status}): ${JSON.stringify(content)}`);

				resolve(response.data);
			}
			).catch(async (error) => {
				if (error.response) {
					// The request was made and the server responded with a status code

					this.log.warn(`Warnmeldung`);
				} else if (error.request) {
					// The request was made but no response was received
					// `error.request` is an instance of XMLHttpRequest in the browser and an instance of
					// http.ClientRequest in node.js<div></div>
					this.log.info(error.message);
				} else {
					// Something happened in setting up the request that triggered an Error
					this.log.info(error.message);
				}
				reject('http error');
			});

		});
	}

	async get_DevieProfileParameter(Profile, ParameterID, IPadress, Port) {
		return new Promise(async (resolve, reject) => {

			this.log.debug(`[getDevieParameter(ParameterID)] ${ParameterID}${Profile}`);

			axios({
				method: 'get', url: 'Http://' + String(IPadress) + ':' + String(Port) + '/safe-tec/get/' + String(ParameterID) + String(Profile), timeout: 10000, responseType: 'json'
			}
			).then(async (response) => {
				const content = response.data;
				this.log.debug(`[getSensorData] local request done after ${response.responseTime / 1000}s - received data (${response.status}): ${JSON.stringify(content)}`);

				resolve(response.data);
			}
			).catch(async (error) => {
				if (error.response) {
					// The request was made and the server responded with a status code

					this.log.warn(`Warnmeldung`);
				} else if (error.request) {
					// The request was made but no response was received
					// `error.request` is an instance of XMLHttpRequest in the browser and an instance of
					// http.ClientRequest in node.js<div></div>
					this.log.info(error.message);
				} else {
					// Something happened in setting up the request that triggered an Error
					this.log.info(error.message);
				}
				reject('http error');
			});

		});
	}
	//===================================================

	async state_profile_PA(ProfileNumber, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Profiles.' + String(ProfileNumber) + '.PA' + String(ProfileNumber);
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							'en': 'Profile ' + String(ProfileNumber) + ' available',
							'de': 'Profil ' + String(ProfileNumber) + ' verfügbar',
							'ru': 'Профиль ' + String(ProfileNumber) + ' доступен',
							'pt': 'Perfil ' + String(ProfileNumber) + ' disponível',
							'nl': 'Profiel ' + String(ProfileNumber) + ' beschikbaar',
							'fr': 'Profil ' + String(ProfileNumber) + ' disponible',
							'it': 'Profilo ' + String(ProfileNumber) + ' disponibile',
							'es': 'Perfil ' + String(ProfileNumber) + ' disponible',
							'pl': 'Profil ' + String(ProfileNumber) + ' dostępny',
							'zh-cn': '配置文件 ' + String(ProfileNumber) + ' 可用'
						},
						type: 'boolean',
						role: 'indicator.available',
						read: true,
						write: false
					},
					native: {}
				});
				if (parseFloat(value['getPA' + String(ProfileNumber)]) == 0) {
					this.setStateAsync(state_ID, { val: false, ack: true });
				}
				else {
					this.setStateAsync(state_ID, { val: true, ack: true });
				}
				resolve(true);
			} catch (err) {
				this.log.error(err.message);
				reject(err);
			}
		});

	}

	async state_profile_PN(ProfileNumber, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Profiles.' + String(ProfileNumber) + '.PN' + String(ProfileNumber);
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							'en': 'Profile ' + String(ProfileNumber) + ' name',
							'de': 'Profil ' + String(ProfileNumber) + ' Name',
							'ru': 'Имя профиля ' + String(ProfileNumber) + '',
							'pt': 'Nome do perfil ' + String(ProfileNumber) + '',
							'nl': 'Profiel ' + String(ProfileNumber) + ' naam',
							'fr': 'Nom du profil ' + String(ProfileNumber) + '',
							'it': 'Nome del profilo ' + String(ProfileNumber) + '',
							'es': 'Perfil ' + String(ProfileNumber) + ' nombre',
							'pl': 'Nazwa profilu ' + String(ProfileNumber) + '',
							'zh-cn': '配置文件 ' + String(ProfileNumber) + ' 名称'
						},
						type: 'string',
						role: 'info.name',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value['getPN' + String(ProfileNumber)], ack: true });
				this.log.info('Profile ' + String(ProfileNumber) + ' Name is ' + value['getPN' + String(ProfileNumber)]);
				resolve(true);
			} catch (err) {
				this.log.error(err.message);
				reject(err);
			}
		});

	}

	async state_profile_PV(ProfileNumber, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Profiles.' + String(ProfileNumber) + '.PV' + String(ProfileNumber);
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							'en': 'Profile ' + String(ProfileNumber) + ' quantity limitation (0 = disabled 1...1900l)',
							'de': 'Profil ' + String(ProfileNumber) + ' Mengenbegrenzung (0 = deaktiviert 1...1900l)',
							'ru': 'Ограничение количества профиля ' + String(ProfileNumber) + ' (0 = отключено 1...1900l)',
							'pt': 'Limitação de quantidade do perfil ' + String(ProfileNumber) + ' (0 = desabilitado 1...1900l)',
							'nl': 'Profiel ' + String(ProfileNumber) + ' hoeveelheidsbeperking (0 = uitgeschakeld 1...1900l)',
							'fr': 'Limitation de quantité profil ' + String(ProfileNumber) + ' (0 = désactivé 1...1900l)',
							'it': 'Limitazione quantità profilo ' + String(ProfileNumber) + ' (0 = disabilitato 1...1900l)',
							'es': 'Limitación de cantidad perfil ' + String(ProfileNumber) + ' (0 = deshabilitado 1...1900l)',
							'pl': 'Ograniczenie ilości profilu ' + String(ProfileNumber) + ' (0 = wyłączone 1...1900l)',
							'zh-cn': '配置文件 ' + String(ProfileNumber) + ' 数量限制（0 = 禁用 1...1900l）'
						},
						type: 'number',
						role: 'value.info',
						unit: 'l',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: parseFloat(value['getPV' + String(ProfileNumber)]), ack: true });
				resolve(true);
			} catch (err) {
				this.log.error(err.message);
				reject(err);
			}
		});

	}

	async state_profile_PT(ProfileNumber, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Profiles.' + String(ProfileNumber) + '.PT' + String(ProfileNumber);
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							'en': 'Profile ' + String(ProfileNumber) + ' time limit (0 = disabled 1...1500min (25h)',
							'de': 'Profil ' + String(ProfileNumber) + ' Zeitlimit (0 = deaktiviert 1...1500min (25h)',
							'ru': 'Ограничение времени профиля ' + String(ProfileNumber) + ' (0 = отключено 1...1500 мин (25 ч)',
							'pt': 'Limite de tempo do perfil ' + String(ProfileNumber) + ' (0 = desabilitado 1...1500min (25h)',
							'nl': 'Tijdslimiet profiel ' + String(ProfileNumber) + ' (0 = uitgeschakeld 1...1500min (25h)',
							'fr': 'Limite de temps profil ' + String(ProfileNumber) + ' (0 = désactivé 1...1500min (25h)',
							'it': 'Limite di tempo del profilo ' + String(ProfileNumber) + ' (0 = disabilitato 1...1500min (25h)',
							'es': 'Perfil ' + String(ProfileNumber) + ' límite de tiempo (0 = deshabilitado 1...1500min (25h)',
							'pl': 'Limit czasu profilu ' + String(ProfileNumber) + ' (0 = wyłączone 1...1500min (25h)',
							'zh-cn': '配置文件 ' + String(ProfileNumber) + ' 时间限制（0 = 禁用 1...1500min (25h)'
						},
						type: 'number',
						role: 'value.info',
						unit: 'min',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: parseFloat(value['getPT' + String(ProfileNumber)]), ack: true });
				resolve(true);
			} catch (err) {
				this.log.error(err.message);
				reject(err);
			}
		});

	}

	async state_profile_PF(ProfileNumber, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Profiles.' + String(ProfileNumber) + '.PF' + String(ProfileNumber);
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							'en': 'Profile ' + String(ProfileNumber) + ' maximum flow (0 = deaktiviert 1...5000l/h)',
							'de': 'Profil ' + String(ProfileNumber) + ' maximaler Durchfluss (0 = deaktiviert 1...5000l/h)',
							'ru': 'Максимальный расход профиля ' + String(ProfileNumber) + ' (0 = деактивировать 1...5000 л/ч)',
							'pt': 'Fluxo máximo do perfil ' + String(ProfileNumber) + ' (0 = inativo 1...5000l/h)',
							'nl': 'Profiel ' + String(ProfileNumber) + ' maximaal debiet (0 = deaktiviert 1...5000l/h)',
							'fr': 'Profil ' + String(ProfileNumber) + ' débit maximum (0 = désactivation 1...5000l/h)',
							'it': 'Portata massima profilo ' + String(ProfileNumber) + ' (0 = deaktiviert 1...5000l/h)',
							'es': 'Perfil ' + String(ProfileNumber) + ' caudal máximo (0 = desactivado 1...5000l/h)',
							'pl': 'Profil ' + String(ProfileNumber) + ' maksymalny przepływ (0 = deaktiviert 1...5000l/h)',
							'zh-cn': '轮廓 ' + String(ProfileNumber) + ' 最大流量 (0 = 失职 1...5000l/h)'
						},
						type: 'number',
						role: 'value.max',
						unit: 'l/h',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: parseFloat(value['getPF' + String(ProfileNumber)]), ack: true });
				resolve(true);
			} catch (err) {
				this.log.error(err.message);
				reject(err);
			}
		});

	}

	async state_profile_PM(ProfileNumber, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Profiles.' + String(ProfileNumber) + '.PM' + String(ProfileNumber);
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							'en': 'Profile ' + String(ProfileNumber) + ' microleak detektion',
							'de': 'Profil ' + String(ProfileNumber) + ' Mikroleckerkennung',
							'ru': 'Профиль ' + String(ProfileNumber) + ' обнаружение микроутечек',
							'pt': 'Detecção de microvazamento de perfil ' + String(ProfileNumber) + '',
							'nl': 'Profiel ' + String(ProfileNumber) + ' microlekdetectie',
							'fr': 'Détection de microfuite profil ' + String(ProfileNumber) + '',
							'it': 'Rilevamento microperdite del profilo ' + String(ProfileNumber) + '',
							'es': 'Perfil ' + String(ProfileNumber) + ' detección de microfugas',
							'pl': 'Profil ' + String(ProfileNumber) + ' wykrywanie mikroprzecieków',
							'zh-cn': '轮廓 ' + String(ProfileNumber) + ' 微泄漏检测'
						},
						type: 'string',
						role: 'info.status',
						read: true,
						write: false
					},
					native: {}
				});
				if (parseFloat(value['getPM' + String(ProfileNumber)]) == 0) {
					this.setStateAsync(state_ID, { val: 'disabled', ack: true });
					this.log.info('Profile ' + String(ProfileNumber) + ' Microleak Detektion is disabled');
				}
				else {
					this.setStateAsync(state_ID, { val: 'enabled', ack: true });
					this.log.info('Profile ' + String(ProfileNumber) + ' Microleak Detektion is enabled');
				}
				resolve(true);
			} catch (err) {
				this.log.error(err.message);
				reject(err);
			}
		});

	}

	async state_profile_PR(ProfileNumber, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Profiles.' + String(ProfileNumber) + '.PR' + String(ProfileNumber);
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Profile ' + String(ProfileNumber) + ' Return Time to standard Profile (1...720h (30 Days))',
							de: 'Profil ' + String(ProfileNumber) + ' Zeit bis zur Rückkehr zum Standardprofil (1...720h (30 Tage))'
						},
						type: 'string',
						role: 'value.info',
						unit: 'h',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value['getPR' + String(ProfileNumber)], ack: true });
				this.log.info('Profile ' + String(ProfileNumber) + ' return time ' + String(value['getPR' + String(ProfileNumber)]));
				resolve(true);
			} catch (err) {
				this.log.error(err.message);
				reject(err);
			}
		});

	}

	async state_profile_PB(ProfileNumber, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Profiles.' + String(ProfileNumber) + '.PB' + String(ProfileNumber);
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							'en': 'Profile ' + String(ProfileNumber) + ' Buzzer',
							'de': 'Profil ' + String(ProfileNumber) + ' Summer',
							'ru': 'Профиль ' + String(ProfileNumber) + ' Зуммер',
							'pt': 'Campainha do Perfil ' + String(ProfileNumber),
							'nl': 'Profiel ' + String(ProfileNumber) + ' zoemer',
							'fr': 'Profil ' + String(ProfileNumber) + ' Buzzer',
							'it': 'Cicalino di profilo ' + String(ProfileNumber),
							'es': 'Perfil ' + String(ProfileNumber) + ' Zumbador',
							'pl': 'Profil ' + String(ProfileNumber) + ' Brzęczyk',
							'zh-cn': '配置文件 ' + String(ProfileNumber) + ' 蜂鸣器'
						},
						type: 'string',
						role: 'info.status',
						read: true,
						write: false
					},
					native: {}
				});
				if (parseFloat(value['getPB' + String(ProfileNumber)]) == 0) {
					this.setStateAsync(state_ID, { val: 'disabled', ack: true });
					this.log.info('Profile ' + String(ProfileNumber) + ' Busser is disabled');
				}
				else {
					this.setStateAsync(state_ID, { val: 'enabled', ack: true });
					this.log.info('Profile ' + String(ProfileNumber) + ' Busser is enabled');
				}
				resolve(true);
			} catch (err) {
				this.log.error(err.message);
				reject(err);
			}
		});

	}

	async state_profile_PW(ProfileNumber, value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Profiles.' + String(ProfileNumber) + '.PW' + String(ProfileNumber);
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							'en': 'Profile ' + String(ProfileNumber) + ' leakage warning',
							'de': 'Profil ' + String(ProfileNumber) + ' Leckagewarnung',
							'ru': 'Предупреждение об утечке профиля ' + String(ProfileNumber),
							'pt': 'Aviso de vazamento do perfil ' + String(ProfileNumber),
							'nl': 'Lekkagewaarschuwing profiel ' + String(ProfileNumber),
							'fr': 'Alerte fuite profil ' + String(ProfileNumber),
							'it': 'Avviso di perdita del profilo ' + String(ProfileNumber),
							'es': 'Advertencia de fuga del perfil ' + String(ProfileNumber),
							'pl': 'Ostrzeżenie o wycieku profilu ' + String(ProfileNumber),
							'zh-cn': 'Profile ' + String(ProfileNumber) + ' 泄漏警告'
						},
						type: 'string',
						role: 'info.status',
						read: true,
						write: false
					},
					native: {}
				});
				if (parseFloat(value['getPW' + String(ProfileNumber)]) == 0) {
					this.setStateAsync(state_ID, { val: 'disabled', ack: true });
					this.log.info('Profile ' + String(ProfileNumber) + ' Leakage Warning disabled');
				}
				else {
					this.setStateAsync(state_ID, { val: 'enabled', ack: true });
					this.log.info('Profile ' + String(ProfileNumber) + ' Leakage Warning is enabled');
				}
				resolve(true);
			} catch (err) {
				this.log.error(err.message);
				reject(err);
			}
		});

	}

	async state_ALA(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Conditions.ALA';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Alarm Status',
							de: 'Alarm Status'
						},
						type: 'string',
						role: 'conditions.alarm',
						read: true,
						write: false
					},
					native: {}
				});
				let AlarmText;
				switch (String(value.getALA)) {
					case 'FF':
						AlarmText = 'NO ALARM';
						break;
					case 'A1':
						AlarmText = 'ALARM END SWITCH';
						break;
					case 'A2':
						AlarmText = 'NO NETWORK';
						break;
					case 'A3':
						AlarmText = 'ALARM VOLUME LEAKAGE';
						break;
					case 'A4':
						AlarmText = 'ALARM TIME LEAKAGE';
						break;
					case 'A5':
						AlarmText = 'ALARM MAX FLOW LEAKAGE';
						break;
					case 'A6':
						AlarmText = 'ALARM MICRO LEAKAGE';
						break;
					case 'A7':
						AlarmText = 'ALARM EXT. SENSOR LEAKAGE';
						break;
					case 'A8':
						AlarmText = 'ALARM TURBINE BLOCKED';
						break;
					case 'A9':
						AlarmText = 'ALARM PRESSURE SENSOR ERROR';
						break;
					case 'AA':
						AlarmText = 'ALARM TEMPERATURE SENSOR ERROR';
						break;
					case 'AB':
						AlarmText = 'ALARM CONDUCTIVITY SENSOR ERROR';
						break;
					case 'AC':
						AlarmText = 'ALARM TO HIGH CONDUCTIVITY';
						break;
					case 'AD':
						AlarmText = 'LOW BATTERY';
						break;
					case 'AE':
						AlarmText = 'WARNING VOLUME LEAKAGE';
						break;
					case 'AF':
						AlarmText = 'ALARM NO POWER SUPPLY';
						break;
					default:
						AlarmText = 'undefined';
				}
				this.setStateAsync(state_ID, { val: AlarmText, ack: true });
				this.log.info('Alarm Status: ' + AlarmText);
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_VER(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.VER';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Device Firmware Version',
							de: 'Gerät Firmware Version'
						},
						type: 'string',
						role: 'info.firmware',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getVER, ack: true });
				this.log.info('Device Firmware Version: ' + String(value.getVER));
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_WIP(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.WIP';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Device IP Address',
							de: 'Gerät IP-Adresse'
						},
						type: 'string',
						role: 'info.ip',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getWIP, ack: true });
				this.log.info('Device IP: ' + String(value.getWIP));
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_MAC(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.MAC';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Device MAC Address',
							de: 'Gerät MAC-Adresse'
						},
						type: 'string',
						role: 'info.mac',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getMAC, ack: true });
				this.log.info('Device MAC Address: ' + String(value.getMAC));
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_WGW(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.WGW';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Device Default Gateway',
							de: 'Gerät Standard Gateway'
						},
						type: 'string',
						role: 'info.gateway',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getWGW, ack: true });
				this.log.info('Device Default Gateway: ' + String(value.getWGW));
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_SRN(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.SRN';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Device Serial Number',
							de: 'Gerät Seriennummer'
						},
						type: 'string',
						role: 'info.serial',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getSRN, ack: true });
				this.log.info('Device Serial Number: ' + String(value.getSRN));
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_CNO(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.CNO';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Device Code Number',
							de: 'Gerät Code Nummer'
						},
						type: 'string',
						role: 'info.code',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getCNO, ack: true });
				this.log.info('Device Code Number: ' + String(value.getCND));
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_WFR(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.WFR';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'WiFi RSSI',
							de: 'WLAN RSSI'
						},
						type: 'string',
						role: 'info.rssi',
						unit: '%',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getWFR, ack: true });
				this.log.info('WiFi RSSI is ' + String(value.getWFR) + ' %');
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_WFC(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.WFC';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'WiFi SSID',
							de: 'WLAN SSID'
						},
						type: 'string',
						role: 'info.ssid',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getWFC, ack: true });
				this.log.info('WiFi SSID is ' + String(value.getWFC));
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_WFS(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.WFS';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'WiFi State',
							de: 'WLAN Status'
						},
						type: 'string',
						role: 'info.wifistate',
						read: true,
						write: false
					},
					native: {}
				});
				if (String(value.getWFS) == '0') {
					this.setStateAsync(state_ID, { val: 'disconected', ack: true });
					this.log.info('WiFi is disconected');
				} else if (String(value.getWFS) == '1') {
					this.setStateAsync(state_ID, { val: 'connecting', ack: true });
					this.log.info('WiFi is connecting');
				} else if (String(value.getWFS) == '2') {
					this.setStateAsync(state_ID, { val: 'connected', ack: true });
					this.log.info('WiFi is connected');
				} else {
					this.setStateAsync(state_ID, { val: 'undefined', ack: true });
					this.log.info('WiFi is undefined');
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_SRV(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.SRV';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Next Maintenance',
							de: 'Nächster Service'
						},
						type: 'string',
						role: 'info.service',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getSRV, ack: true });
				this.log.info('Next Maintenance: ' + String(value.getSRV));
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_WAH(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.WAH';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'WiFi AP hidden',
							de: 'WLAN AP versteckt'
						},
						type: 'boolean',
						role: 'info.wifihidden',
						read: true,
						write: false
					},
					native: {}
				});
				if (value.getWAH == '0') {
					this.setStateAsync(state_ID, { val: false, ack: true });
					this.log.info('WiFi AP is not hidden');
				}
				else {
					this.setStateAsync(state_ID, { val: true, ack: true });
					this.log.info('WiFi AP is hidden');
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_WAD(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.WAD';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'WiFi AP disabled',
							de: 'WLAN AP deaktiviert'
						},
						type: 'boolean',
						role: 'info.wifidisabled',
						read: true,
						write: false
					},
					native: {}
				});
				if (String(value.getWAD) == '0') {
					this.setStateAsync(state_ID, { val: false, ack: true });
					this.log.info('WiFi AP is enabled');
				}
				else {
					this.setStateAsync(state_ID, { val: true, ack: true });
					this.log.info('WiFi AP is disabled');
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_APT(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.APT';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'WiFi AP Timeout',
							de: 'WLAN AP Timeout'
						},
						type: 'string',
						role: 'info.wifitimeout',
						unit: 's',
						read: true,
						write: false
					},
					native: {}
				});
				if (parseFloat(value.getAPT) > 0) {
					this.setStateAsync(state_ID, { val: value.getAPT, ack: true });
					this.log.info('WiFi AP Timeout: ' + String(value.getAPT) + ' s');
				}
				else {
					this.setStateAsync(state_ID, { val: 'disabled', ack: true });
					this.log.info('WiFi AP Timeout is Disabled');
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_DWL(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.DWL';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'WiFi deactivate',
							de: 'WLAN deaktivieren'
						},
						type: 'boolean',
						role: 'info.wifideaktivate',
						read: true,
						write: false
					},
					native: {}
				});
				if (String(value.getDWL) == '0') {
					this.setStateAsync(state_ID, { val: false, ack: true });
					this.log.info('WiFi is deactivated');
				}
				else {
					this.setStateAsync(state_ID, { val: true, ack: true });
					this.log.info('WiFi is activated');
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_BAT(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.BAT';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Battery Voltage',
							de: 'Batteriespannung'
						},
						type: 'string',
						role: 'info.batteryvoltage',
						unit: 'V',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getBAT, ack: true });
				this.log.info('Battery Voltage: ' + String(value.getBAT) + ' V');
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_NET(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.NET';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'DC Power Adapter Voltage',
							de: 'DC Netzteil Spannung'
						},
						type: 'string',
						role: 'info.powersupplyvoltage',
						unit: 'V',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getNET, ack: true });
				this.log.info('DC Power Adapter Voltage: ' + String(value.getNET) + ' V');
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_IDS(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Device.Info.IDS';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Daylight saving Time enabled',
							de: 'Sommerzeitumschaltung aktieviert'
						},
						type: 'boolean',
						role: 'info.daylightsavingenabled',
						read: true,
						write: false
					},
					native: {}
				});
				if (String(value.getIDS) == '0') {
					this.setStateAsync(state_ID, { val: false, ack: true });
					this.log.info('Daylight saving Time is disabled');
				}
				else {
					this.setStateAsync(state_ID, { val: true, ack: true });
					this.log.info('Daylight saving Time is enabled');
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_AVO(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Consumptions.AVO';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Current water consumption',
							de: 'Aktuelle Wasserentnahme'
						},
						type: 'string',
						role: 'consumptions.currentvolume',
						unit: 'mL',
						read: true,
						write: false
					},
					native: {}
				});

				this.setStateAsync(state_ID, { val: String(parseFloat(String(value.getAVO).replace('mL', ''))), ack: true });
				this.log.info('Current water consumption: ' + String(parseFloat(String(value.getAVO).replace('mL', ''))) + ' mL');
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_LTV(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Consumptions.LTV';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Last Taped Water',
							de: 'Letzte Wasserentnahme'
						},
						type: 'string',
						role: 'consumptions.lasttapedvolume',
						unit: 'L',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: value.getLTV, ack: true });
				this.log.info('Last Taped Water: ' + String(value.getLTV) + ' L');
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_VOL(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Consumptions.VOL';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Total Water Volume',
							de: 'Gesamte Wasserentnahme'
						},
						type: 'string',
						role: 'consumptions.totalvolume',
						unit: 'm3',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: String(parseFloat(String(value.getVOL).replace('Vol[L]', '')) / 1000), ack: true });
				this.log.info('Total Water Volume: ' + String(parseFloat(String(value.getVOL).replace('Vol[L]', '')) / 1000) + ' m3');
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_CEL(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Conditions.CEL';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Water temperature',
							de: 'Wassertemperatur'
						},
						type: 'string',
						role: 'conditions.watertemp',
						unit: '°C',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: String((parseFloat(String(value.getCEL)) / 10)), ack: true });
				this.log.info('Water temperature: ' + String((parseFloat(String(value.getCEL)) / 10)) + ' °C');
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

	async state_CND(value) {
		return new Promise(async (resolve, reject) => {
			try {
				const state_ID = 'Conditions.CND';
				await this.setObjectNotExistsAsync(state_ID, {
					type: 'state',
					common: {
						name: {
							en: 'Water conductivitye',
							de: 'Leitfähigkeit'
						},
						type: 'string',
						role: 'conditions.waterconductivity',
						unit: 'uS/cm',
						read: true,
						write: false
					},
					native: {}
				});
				this.setStateAsync(state_ID, { val: String(value.getCND), ack: true });
				this.log.info('Water conductivity: ' + String(value.getCND) + ' uS/cm');
				resolve(true);
			} catch (err) {
				reject(err);
			}
		});
	}

}

//===================================================
// Async Delay Funktion (you can await for delay)
function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

const isObject = function (val) {
	if (val === null) { return false; }
	return (typeof val === 'object');
};

//===================================================
// Timer Event Handler
async function alarm_poll() {
	try {
		await myAdapter.alarm_TimerTick();
	} catch (err) {
		//throw new Error(err);
	}
}

async function short_poll() {
	try {
		await myAdapter.short_TimerTick();
	} catch (err) {
		//throw new Error(err);
	}
}

async function long_poll() {
	try {
		await myAdapter.long_TimerTick();
	} catch (err) {
		//throw new Error(err);
	}
}

async function cron_poll_day() {
	try {
		await myAdapter.alarm_cron_day_Tick();
	} catch (err) {
		//throw new Error(err);
	}

}

async function cron_poll_week() {
	try {
		await myAdapter.alarm_cron_week_Tick();
	} catch (err) {
		//throw new Error(err);
	}

}

async function cron_poll_month() {
	try {
		await myAdapter.alarm_cron_month_Tick();
	} catch (err) {
		//throw new Error(err);
	}

}

async function cron_poll_year() {
	try {
		await myAdapter.alarm_cron_year_Tick();
	} catch (err) {
		//throw new Error(err);
	}

}
//===================================================

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new wamo(options);
} else {
	// otherwise start the instance directly
	new wamo();
}


