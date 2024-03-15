import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import FreestylerDmxConnector from './freestyler-connector';

// Create Express server
const app = express(); // New express instance
const port = 3000; // Port number

// Express configuration
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Enable Morgan
app.use(express.json()); // <=== Enable JSON body parser

let fsConnector: FreestylerDmxConnector
function ensureFreestylerConnected(response: Response): void {
    let mesage
    if(!fsConnector) mesage = "Connection to freestyer wasn't started";
    else if(!fsConnector.connected) mesage = fsConnector.connectionError;

    if(mesage) response.status(500).json({mesage})
}

// Start Express server
app.listen(port, () => {
  // Callback function when server is successfully started
  console.log(`Server started at http://localhost:${port}`);
});

// Define Express routes
app.get('/freestyler/status', (req: Request, res: Response) => {
    res.send('Running!');
  });

app.post('/freestyler/connect', (req: Request, res: Response) => {
    if(fsConnector && fsConnector.connected) fsConnector.close()
    console.log("body", req.body, "params", req.params)
    const {port, hostname}: {port: number, hostname: string} = req.body
    let tmpFsConnector = new FreestylerDmxConnector(hostname, port)
    tmpFsConnector.setup()
    .catch(e => res.status(500).json({mesage: e.toString()}))
    .then(_ => {
        console.log("then!")
        fsConnector = tmpFsConnector
        res.status(200).json({status: "Connected"})
    })
})

app.get('/freestyler/cues', (req: Request, res: Response) => {
    ensureFreestylerConnected(res)
    res.status(200).json(fsConnector.listCues())
})

app.get('/freestyler/cues/:name/start', (req: Request, res: Response) => {
    ensureFreestylerConnected(res)
    fsConnector.startCue(req.params.name)
    res.status(200).json()
})

app.get('/freestyler/cues/:name/stop', (req: Request, res: Response) => {
    ensureFreestylerConnected(res)
    fsConnector.stopCue(req.params.name)
    res.status(200).json()
})

// Export Express app
export default app;