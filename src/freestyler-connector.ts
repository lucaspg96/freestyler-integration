import * as net from 'net';

type socketCallbackFunction = {(data: string): void}
const ASCII_CODE_PREFIX = "FSOC"
const BUTTON_CLICK_SUFIX = "255"
const CLEAR = ASCII_CODE_PREFIX + '335'+BUTTON_CLICK_SUFIX

class FreestylerDmxConnector{
    hostname: string;
    port: number;
    socket: net.Socket = new net.Socket();
    connected: boolean = false;
    dataListeners: {[id: string]: socketCallbackFunction;} = {};
    cueNames: string[] = []
    connectionError ?:string

    constructor(hostname: string, port: number) {
        this.hostname = hostname;
        this.port = port;
    }

    ensureConnected(): void {
        if(!this.connected) throw new Error("Freestyler connector is not connected")
    }

    setup() {
        const promisse:Promise<void> = new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            console.log(`Initiating Freestyler TCP socket on ${this.hostname}:${this.port}`)
            this.socket.connect(this.port, this.hostname, () => {
                console.log("Connected!")
                this.connected = true;
                resolve(this.loadCues())
            })

            this.socket.on("error",(e) => {
                this.connected = false;
                this.connectionError = `Error connection to freestyler on ${this.hostname}:${this.port}: ${e}`;
                console.log("Error@")
                console.log(this.connectionError)
                reject(e)
            });

            this.socket.on("close",(e) => {
                console.log("Closing connection", e)
                this.connected = false;
            });
            this.socket.addListener('data', buffer => {
                const txt = buffer.toString("utf8")
                // filtering keep alive
                if(txt === "�")
                    return
                else {
                    console.log("[Freestyler Response]", txt)
                    Object.entries(this.dataListeners).forEach(([_,f]) => f(txt))
                }
            })
        })
        
        return promisse
    }

    loadCues(): Promise<void> {
        this.ensureConnected()
        const promise: Promise<void> = new Promise((resolve, reject) => {
            this.addListener("cueBuilder", (txt) => {
                const rawNames = txt.split(",")
                rawNames.shift()
                this.cueNames = rawNames.map(cn => cn.toLowerCase())
                this.removeListener("cueBuilder")
                console.log("Loaded cues:", rawNames)
                resolve()
            })
            this.socket.write("FSBC"+"001"+"000")
        });
        
        return promise
    }

    getConnectionStatus(this: any):boolean { return this.connected }

    addListener(id: string, listener: socketCallbackFunction): void {
        this.dataListeners[id] = listener
    }

    removeListener(id: string): void {
        delete this.dataListeners[id]
    }

    startCue(cueName: string): void {
        this.ensureConnected()
        const idx = this.cueNames.indexOf(cueName.toLowerCase())
        if(idx > -1){
            var t = CLEAR;
            // cueListIdx start on 0
            t += ASCII_CODE_PREFIX + (505 + idx) + BUTTON_CLICK_SUFIX
            this.socket.write(t);
        }
        else {
            throw new Error(`Unknown cuelist: ${cueName}`)
        }
    }

    stopCue(cueName: string): void {
        this.ensureConnected()
        const idx = this.cueNames.indexOf(cueName.toLowerCase())
        if(idx > -1){
            var t = CLEAR;
            // cueListIdx start on 0
            t += ASCII_CODE_PREFIX + (525 + idx) + BUTTON_CLICK_SUFIX
            this.socket.write(t);
        }
        else {
            throw new Error(`Cuelist ${cueName} unkown`)
        }
    }

    listCues(): String[] {
        return this.cueNames.filter(c => c.length > 0)
    }

    close(): void {
        this.socket.end();
	    this.connected = false;
    }
}

export default FreestylerDmxConnector;