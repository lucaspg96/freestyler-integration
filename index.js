const FreestylerConnector = require("./freestyler-node-connector.js")

let HOST = "192.168.0.130"
let api = new FreestylerConnector(HOST);

let deviceBandSize = 7
let firstDeviceStart = 0
let nDevices = 6

function setDevicesToRed(api){
    let msg = {}
    for(let i = 0; i < nDevices; i++){
        const deviceStart = (i*deviceBandSize) + firstDeviceStart
        let [dim,r,g,b] = [0,1,2,3].map(x => x+deviceStart)
        msg = {...msg, 
            [r]: 255,
            [g]: 0,
            [b]: 0
        } 
        // console.log("Set device starting on ", msg)
    }
    console.log("Sending message:", msg)
	api.setDMXFromArray(msg);// Set lamps to red
}

api.connect().then(function(){
    // Change the color of some fixtures
	// setDevicesToRed(api)

    // Cue captions (test-green, default-pink, ...)
    api.onNextMessage(msg => {
        console.log("Cuelists :", msg)
    })
    api.send("FSBC"+"001"+"000")

    // Cue status
    // api.onNextMessage(msg => {
    //     console.log("Cue status:", msg)
    // })
    // api.send("FSBC"+"005"+"000")

    // simple scene change example
    api.startSequence(1)
    setTimeout(() => api.startSequence(2), 1000*5)
    setTimeout(() => api.stopSequence(2), 1000*10)

    // Finish the socket comunication
    // api.close()
}).done();