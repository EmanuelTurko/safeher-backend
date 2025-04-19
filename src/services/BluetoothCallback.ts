import { BluetoothState } from './BluetoothState';
import { BluetoothError } from './BluetoothError';
import { Peripheral } from '@abandonware/noble';

type BluetoothDevice = Peripheral;

export interface BluetoothCallback {
    onStateChanged(state: BluetoothState): void;
    onDeviceFound(device: BluetoothDevice): void;
    onDeviceConnected(device: BluetoothDevice): void;
    onConnectionStatusChanged(status: string): void;
    onServicesDiscovered(): void;
    onCommandSent(command: string): void;
    onDataReceived(data: Buffer, isCompleteFile?: boolean): void;
    onFileTransferStarted(): void;
    onFileTransferProgress(bytesReceived: number): void;
    onTransferComplete(): void;
    onNotificationStatusChanged(enabled: boolean, status: string): void;
    onStatusMessage(message:string): void;
    onMetaDataReceived(totalImages: number): void;
    onError(error: BluetoothError,message:string): void;
}