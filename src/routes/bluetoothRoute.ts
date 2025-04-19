import express,{Request,Response} from 'express';
import { BluetoothController } from '../controllers/BluetoothController';
import {BluetoothCallback} from "../services/BluetoothCallback";
import {BluetoothState} from "../services/BluetoothState";
import {BluetoothError} from "../services/BluetoothError";
import { Peripheral } from '@abandonware/noble';

const router = express.Router();

const bluetoothCallback: BluetoothCallback = {
    onStateChanged: (state: BluetoothState) => {
        console.log(`State changed: ${state}`);
    },
    onDeviceFound: (device: Peripheral) => {
        console.log(`Device found: ${device.advertisement.localName}`);
    },
    onDeviceConnected: (device: Peripheral) => {
        console.log(`Device connected: ${device.advertisement.localName}`);
    },
    onConnectionStatusChanged: (status: string) => {
        console.log(`Connection status changed: ${status}`);
    },
    onServicesDiscovered: () => {
        console.log("Services discovered!");
    },
    onCommandSent: (command: string) => {
        console.log(`Command sent: ${command}`);
    },
    onDataReceived: (data: Buffer, isCompleteFile = false) => {
        console.log(`Data received: ${data.toString('hex')}, Complete: ${isCompleteFile}`);
    },
    onFileTransferStarted: () => {
        console.log("File transfer started");
    },
    onFileTransferProgress: (bytesReceived: number) => {
        console.log(`File transfer progress: ${bytesReceived} bytes received`);
    },
    onTransferComplete: () => {
        console.log("Transfer complete!");
    },
    onNotificationStatusChanged: (enabled: boolean, status: string) => {
        console.log(`Notification status changed. Enabled: ${enabled}, Status: ${status}`);
    },
    onStatusMessage: (message: string) => {
        console.log(`Status message: ${message}`);
    },
    onMetaDataReceived: (totalImages: number) => {
        console.log(`Total images: ${totalImages}`);
    },
    onError: (error: BluetoothError, message: string) => {
        console.error(`Error: ${error}, Message: ${message}`);
    }
};
const bluetoothController = new BluetoothController(bluetoothCallback);

router.get('/start-scanning', (req:Request,res:Response) => {
    bluetoothController.startScanning();
    res.json({ message: 'Scanning started' });
});

router.post('/connect-device', (req:Request,res:Response) => {
    const deviceId = req.body.deviceId;
    if(deviceId){
        const peripheral = bluetoothController.getPeripheralById(deviceId);
        if(peripheral) {
            bluetoothController.connectToDevice(peripheral);
            res.json({ message:`Connecting to device with ID: ${deviceId}`});
        } else {
            res.status(404).json({error: `Device with ID: ${deviceId} not found`});
        }
    } else {
        res.status(400).json({error:'Device ID is required'});
    }
});

router.post('/send-command', (req:Request,res:Response) => {
    const command:string = req.body.command;
    if(command){
        try{
            bluetoothController.sendCommand(command);
            res.json({message:`Command sent: ${command}`});
        } catch(error){
            console.error(`Error sending command: ${error}`);
            res.status(500).json({error:`Error sending command: ${error}`});
        }
    } else {
        res.status(400).json({error:'Command is required'});
    }
});

router.get('/disconnect', (req:Request,res:Response) => {
    if(bluetoothController.peripheral) {
        bluetoothController.disconnect();
        res.json({message:'Disconnecting from device'});
    } else {
        res.status(400).json({error:'No device connected'});
    }
});

export default router;




