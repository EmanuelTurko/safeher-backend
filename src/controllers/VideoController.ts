import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';

interface ConversionCallback {
    onSuccess(uri: string): void;
    onFailure(error: string): void;
}

class VideoController {
    private readonly tempImageDir: string;

    constructor(private context: string){
        this.tempImageDir = path.join(this.context, 'esp32_images');
        if(!fs.existsSync(this.tempImageDir)){
            fs.mkdirSync(this.tempImageDir);
        }
    }

    public saveImageData(data: Buffer, index:number): boolean {
        try{
            const imageFile = path.join(this.tempImageDir,`frame_${index.toString().padStart(4, '0')}.jpg`);
            fs.writeFileSync(imageFile,data);

            const image = fs.readFileSync(imageFile);
            if(image.length === 0){
                console.error(`Invalid JPEG dimensions for frame ${index}`);
                fs.unlinkSync(imageFile);
                return false;
            }
            console.log(`Saved frame ${index} (${data.length} bytes)`);
            return true;

        } catch(error){
            console.error(`Error saving frame ${index}`, error);
            return false;
        }
    };

    public convertToVideo(framerate: number = 12, callback: ConversionCallback): void {
        try {
            const frames: string[] = fs.readdirSync(this.tempImageDir)
                .filter(file => file.match(/^frame_\d{4}\.jpg$/))
                .sort();
            if (frames.length === 0) {
                callback.onFailure(`No frames found in ${this.tempImageDir}`);
                return;
            }

            frames.forEach(file => {
                const filePath = path.join(this.tempImageDir, file);
                if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
                    callback.onFailure(`Missing or empty frame: ${file}`);
                    return;
                }
            });

            const outputDir = path.join(this.context, 'esp32_videos');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }

            const outputFile = path.join(outputDir, `output_${Date.now()}.mp4`);
            ffmpeg()
                .input(path.resolve(this.tempImageDir, 'frame_%04d.jpg'))
                .inputOptions([`-framerate ${framerate}`])
                .outputOptions([
                    '-c:v libx264',
                    '-preset ultrafast',
                    '-pix_fmt yuv420p',
                    '-vf scale=800:-2,format=yuv420p',
                    '-movflags +faststart'
                ])
                .on('start', (cmd: string) => {
                    console.log('Started ffmpeg with:', cmd);
                })
                .on('stderr', (stderrLine: string) => {
                    console.log('ffmpeg stderr:', stderrLine);
                })
                .on('end', () => {
                    console.log('Video conversion completed');
                    callback.onSuccess(outputFile);
                    this.cleanupTempFiles();
                })
                .on('error', (err: Error, metadata: any) => {
                    console.error('Conversion failed:', err.message);
                    callback.onFailure(`Conversion failed: ${err.message}`);
                })
                .save(outputFile);
        } catch (error: any) {
            console.error('Conversion setup failed', error);
            callback.onFailure(`Setup error: ${error.message}`);
        }
    };


    public saveToPublicStorage(sourceFile: string, callback: (uri: string| null) => void): void {
        try {
            const publicDir = path.join(this.context, 'public_videos');
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir);
            }
            const publicFile = path.join(publicDir, path.basename(sourceFile));
            fs.copyFileSync(sourceFile, publicFile);

            console.log(`File saved to public storage: ${publicFile}`);
            callback(publicFile);
        } catch(error:any){
            console.error('Error saving to public storage', error);
            callback(null);
        }
    };

    private cleanupTempFiles(): void {
        const files = fs.readdirSync(this.tempImageDir);
        files.forEach(file => {
            const filePath = path.join(this.tempImageDir, file);
            try{
                fs.unlinkSync(filePath);
                console.log(`Deleted ${file}`)
            } catch(error:any){
                console.error(`Error deleting file ${file}`, error);
            }
        });
    };

    public getFrameCount(): number{
        const files = fs.readdirSync(this.tempImageDir);
        return files.filter(file => file.startsWith('frame_') && file.endsWith('.jpg')).length;
    }
}

export default VideoController;