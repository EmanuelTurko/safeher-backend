import noble, { Peripheral, Characteristic} from '@abandonware/noble';
import { Buffer } from 'buffer';
import {BluetoothCallback} from "../services/BluetoothCallback";
import { BluetoothState } from '../services/BluetoothState';
import { BluetoothError } from '../services/BluetoothError';


export class BluetoothController {
    private callback: BluetoothCallback;
    private SERVICE_UUID = 'abcd0001-0000-1000-8000-00805f9b34fb';
    private COMMAND_UUID = 'abcd0002-0000-1000-8000-00805f9b34fb';
    private DATA_UUID = 'abcd0003-0000-1000-8000-00805f9b34fb';

    peripheral: Peripheral | null = null;
    private commandChar: Characteristic | null = null;
    private dataChar: Characteristic | null = null;

    private expectedFileSize = 0;
    private currentFileSize = 0;
    private fileBuffer: Buffer[] = [];
    private totalImagesExpected = 0;
    private imagesReceived = 0;

    private discoveredPeripherals: Map<string, Peripheral> = new Map();

    constructor(callback: BluetoothCallback) {
        this.callback = callback;
        noble.on('stateChange', this.onStateChanged.bind(this));
        noble.on('discover', this.onDiscover.bind(this));
    };

    private onStateChanged(state: string) {
        if (state == 'poweredOn') {
            this.startScanning();
        } else {
            noble.stopScanning();
            this.callback.onError(BluetoothError.BLUETOOTH_DISABLED, 'Bluetooth is disabled');
        }
    };

    startScanning() {
        noble.startScanning([this.SERVICE_UUID], true, (error: any) => {
            if (error) {
                this.callback.onError(BluetoothError.SCAN_FAILED, error.message);
                return;
            } else {
                this.callback.onStateChanged(BluetoothState.SCANNING);
            }
        });
    };

    private onDiscover(peripheral: Peripheral) {
        if(!this.discoveredPeripherals.has(peripheral.id)){
            console.log(`Discovered device: ${peripheral.advertisement.localName}`);
            this.discoveredPeripherals.set(peripheral.id, peripheral);
        }
        if (peripheral.advertisement.localName?.includes('SimpleBLE')) {
            noble.stopScanning();
            this.connectToDevice(peripheral);
        }
    };

    public getPeripheralById(deviceId:string): Peripheral | null {
        if(this.peripheral?.id === deviceId) {
            return this.peripheral;
        }
        return null;
    }


    connectToDevice(peripheral: Peripheral) {
        this.peripheral = peripheral;
        this.callback.onStateChanged(BluetoothState.CONNECTING);

        peripheral.connect((error: any) => {
            if (error) {
                this.callback.onError(BluetoothError.CONNECTION_FAILED, error.message);
                return;
            }
            this.callback.onStateChanged(BluetoothState.CONNECTED);
            this.discoverServicesAndCharacteristics(peripheral);
        });

        peripheral.on('disconnect', () => {
            this.callback.onStateChanged(BluetoothState.DISCONNECTED);
            this.cleanup();
        });
    };

    private discoverServicesAndCharacteristics(peripheral: Peripheral) {
        peripheral.discoverSomeServicesAndCharacteristics(
            [this.SERVICE_UUID],
            [this.COMMAND_UUID, this.DATA_UUID],
            (error: any, _: any, characteristics) => {
                if (error) {
                    this.callback.onError(BluetoothError.SERVICE_DISCOVERY_FAILED, error.message);
                    return;
                }

                characteristics.forEach((char) => {
                    if (char.uuid === this.COMMAND_UUID.replace(/-/g, '')) {
                        this.commandChar = char;
                    } else if (char.uuid === this.DATA_UUID.replace(/-/g, '')) {
                        this.dataChar = char;
                    }
                });

                if (this.commandChar && this.dataChar) {
                    this.setupNotifications();
                    this.callback.onServicesDiscovered();
                } else {
                    this.callback.onError(BluetoothError.CHARACTERISTIC_NOT_FOUND, 'Command or Data characteristic not found');
                }
            }
        );
    };

    private setupNotifications(){
        this.commandChar?.subscribe((error:any) => {
            if(error){
                this.callback.onError(BluetoothError.COMMAND_FAILED, error.message);
            }
        });
        this.commandChar?.on('data', this.handleCommandData.bind(this));

        this.dataChar?.subscribe((error:any) => {
            if(error){
                this.callback.onError(BluetoothError.COMMAND_FAILED, error.message);
            }
            this.dataChar?.on('data', this.handleData.bind(this));
        });
    };

    private handleCommandData(data: Buffer) {
        if(data.length == 2){
            this.totalImagesExpected = (data[0] << 8) | data[1];
            this.callback.onMetaDataReceived(this.totalImagesExpected);
        } else {
            this.callback.onError(BluetoothError.DATA_ERROR, 'Invalid command data length');
        }
    };

    private handleData(data: Buffer){
        if(this.expectedFileSize === 0 && data.length >= 4) {
            this.expectedFileSize = data.readUInt32BE(0);
            this.fileBuffer.push(data.subarray(4));
            this.currentFileSize = data.length - 4;
        } else {
            this.fileBuffer.push(data);
            this.currentFileSize += data.length;
        }

        if(this.currentFileSize >= this.expectedFileSize && this.expectedFileSize > 0){
            const completeData = Buffer.concat(this.fileBuffer, this.currentFileSize);
            this.callback.onDataReceived(completeData, true);
            this.imagesReceived++;
            this.sendCommand('RECEIVED');

            if(this.imagesReceived >= this.totalImagesExpected){
                this.callback.onTransferComplete();
            }
            this.resetTransferState();
        }
    };

    private resetTransferState() {
        this.fileBuffer = [];
        this.expectedFileSize = 0;
        this.currentFileSize = 0;
    }

    public sendCommand(command: string) {
        if(!this.commandChar){
            this.callback.onError(BluetoothError.CHARACTERISTIC_NOT_FOUND, 'Command characteristic not found');
            return;
        }
        const buffer = Buffer.from(command, 'utf-8');
        this.commandChar.write(buffer,false, (error:any) => {
            if(error){
                this.callback.onError(BluetoothError.DATA_ERROR, error.message);
            } else {
                this.callback.onCommandSent(command);
            }
        });
    };



    public disconnect() {
        if(this.peripheral){
            this.peripheral.disconnect();

            this.peripheral.once('disconnect', () => {
                this.callback.onStateChanged(BluetoothState.DISCONNECTED);
            });
        }
    };


    private cleanup(){
        this.peripheral = null;
        this.commandChar = null;
        this.dataChar = null;
        this.resetTransferState()
    }
}


