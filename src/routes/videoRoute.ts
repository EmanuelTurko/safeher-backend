import express,{Request,Response} from "express";
import  VideoController  from "../controllers/VideoController";
import path from "node:path";

const router = express.Router();

const context = path.join(__dirname, 'data')
const videoController = new VideoController(context);

router.post('/create-video', (req: Request, res: Response): void => {
    try{
        const {framerate = 12} = req.body;
        const framesData = req.body.framesData;

        if(!framesData || framesData.length === 0){
            res.status(400).json({ error: 'No frames data provided' });
            return;
        }
        framesData.forEach((data: Buffer, index: number) => {
            const success = videoController.saveImageData(data, index);
            if(!success){
                return res.status(500).json({ error: `Failed to save frame ${index}` });
            }
        });

        videoController.convertToVideo(framerate, {
            onSuccess: (uri: string) => {
                videoController.saveToPublicStorage(uri, (publicUri:any) => {
                    if(!publicUri){
                        return res.status(500).json({ error: 'Failed to save video to public storage' });
                    }
                    res.status(200).json({ videoUri: publicUri });
                });
            },
            onFailure: (error: string) => {
                res.status(500).json({ error });
            }
        });
    } catch(error:any){
        console.error(`Error creating video: ${error.message}`);
        res.status(500).json({ error: `Error creating video: ${error.message}` });
    }
});

export default router;