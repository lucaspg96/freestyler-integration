var net = require('net');
var Q = require("q");

const ASCII_CODE_PREFIX = "FSOC"
const BUTTON_CLICK_SUFIX = "255"
const CLEAR = ASCII_CODE_PREFIX + '335'+BUTTON_CLICK_SUFIX

// command anatomy: ASCII_CODE_PREFIX + command + BUTTON_CLICK_SUFIX

// Automatic socket close on end
var next_unique_id = 1;
var socket_array={};

const callbackQueue = [];

function exitHandler(options, err) {
	for(var key in socket_array){
		if(socket_array[key]){
			socket_array[key].end();
			socket_array[key]=null;
		}
	}
    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
// end

function FreestylerConnector(host){
	this.id	  = next_unique_id++;
	this.host = host;
	this.port = 3332;
	this.connected = false;
	this.socket = null;
	socket_array[this.id+""]=null;
	console.log(`Initiating Freestyler TCP socket on ${this.host}:${this.port}`)
};
module.exports = FreestylerConnector;
FreestylerConnector.prototype.connect = function(){
	var deferred = Q.defer();
	this.socket = new net.Socket();
	socket_array[this.id+""]=this.socket;
	var me = this;
	var orig_socket = this.socket;
	console.log("Connecting...")
	this.socket.connect(this.port, this.host, function() {
		console.log("Connected!")
		me.connected = true;
		deferred.resolve();
	});
	this.socket.on("error",function(e){
		console.log(e);
		if(!me.connected){
			deferred.reject(new Error(e));
		}
	});
	this.socket.on("close",function(e){
		console.log("Closing connection", e)
		if(me.socket===orig_socket){
			me.connected = false;
			me.socket = null;
			socket_array[me.id+""]=null;
		}
	});
	this.socket.addListener('data', buffer => {
		const txt = buffer.toString("utf8")
		// filtering keep alive
		if(txt === "�")
			return
		if(callbackQueue.length == 0)
			console.log(txt)
		else {
			const callback = callbackQueue.shift()
			callback(txt)
		}
	})
	return deferred.promise;
};
FreestylerConnector.prototype.close = function(){
	socket_array[this.id+""]=null;
	this.socket.end();
	this.connected = false;
};
var getControlsFromNumber = function(nr){
	//simulates the number typing. For each digit, it sends a command with:
	// - the default prefix
	// - the digit code 319-328, representing 0-9, respectively
	// - 255, meaning that the command will be entered (click)
	var txt = nr+"";
	var t = "";
	for(var i=0;i!=txt.length;i++){
		const d = parseInt(txt[i])
		t+=ASCII_CODE_PREFIX+(320+d-1)+BUTTON_CLICK_SUFIX
		// switch(txt[i]){
		// 	case "0": t+=ASCII_CODE_PREFIX+(320+0-1)+BUTTON_CLICK_SUFIX; break;
		// 	case "1": t+=ASCII_CODE_PREFIX+(320+1-1)+BUTTON_CLICK_SUFIX; break;
		// 	case "2": t+=ASCII_CODE_PREFIX+(320+2-1)+BUTTON_CLICK_SUFIX; break;
		// 	case "3": t+=ASCII_CODE_PREFIX+(320+3-1)+BUTTON_CLICK_SUFIX; break;
		// 	case "4": t+=ASCII_CODE_PREFIX+(320+4-1)+BUTTON_CLICK_SUFIX; break;
		// 	case "5": t+=ASCII_CODE_PREFIX+(320+5-1)+BUTTON_CLICK_SUFIX; break;
		// 	case "6": t+=ASCII_CODE_PREFIX+(320+6-1)+BUTTON_CLICK_SUFIX; break;
		// 	case "7": t+=ASCII_CODE_PREFIX+(320+7-1)+BUTTON_CLICK_SUFIX; break;
		// 	case "8": t+=ASCII_CODE_PREFIX+(320+8-1)+BUTTON_CLICK_SUFIX; break;
		// 	case "9": t+=ASCII_CODE_PREFIX+(320+9-1)+BUTTON_CLICK_SUFIX; break;
		// }
	}
	return t;
};

FreestylerConnector.prototype.setDMX = function(channel,value){
	this.setDMXFromArray({[channel]:value})
};
var nextnr = 0;
	var InternalRunner = function(tt,fs){
		this.id = nextnr++;
		this.ttt = tt+"";
		this.fss = fs;
		console.log(this.id);
		this.cb = function(){
					console.log("hier"+this.id);
					console.log(this.ttt);
					this.fss.socket.write(this.ttt);
				};
	};
FreestylerConnector.prototype.onNextMessage = function(callback){
	callbackQueue.push(callback)
}
FreestylerConnector.prototype.setDMXFromArray = function(array){
	//REFERENCE: https://www.freestylersupport.com/fsforum/viewtopic.php?t=8980
	if(!this.connected) throw new Error("not connected");
	// command CLR (clear?)
	var t = ASCII_CODE_PREFIX + '335'+BUTTON_CLICK_SUFIX;
	var counter = 0;
	for(var key in array){
		// typing the channel number
		t+=getControlsFromNumber(parseInt(key));
		// typing @
		t+=ASCII_CODE_PREFIX + '332'+BUTTON_CLICK_SUFIX;// @
		// typing DMX
		t+=ASCII_CODE_PREFIX + '333'+BUTTON_CLICK_SUFIX;//DMX
		// typing the channel content value
		t+=getControlsFromNumber(array[key]);
		//sending ENTER command
		t+=ASCII_CODE_PREFIX + '337'+BUTTON_CLICK_SUFIX;// ENTER

		counter++;
	}
	this.socket.write(t);
};
FreestylerConnector.prototype.startSequence = function(sequenceIdx){
	if(!this.connected) throw new Error("not connected");
	var t = CLEAR;
	
	// cueListIdx start on 1 since not everyone is a programmer :)
	const idx = 505 + sequenceIdx - 1
	t += ASCII_CODE_PREFIX + idx + BUTTON_CLICK_SUFIX
	this.socket.write(t);
};
FreestylerConnector.prototype.stopSequence = function(sequenceIdx){
	if(!this.connected) throw new Error("not connected");
	var t = CLEAR;
	
	// cueListIdx start on 1 since not everyone is a programmer :)
	const idx = 525 + sequenceIdx - 1
	t += ASCII_CODE_PREFIX + idx + BUTTON_CLICK_SUFIX
	this.socket.write(t);
};
FreestylerConnector.prototype.toggleBlackout = function(){
	this.socket.write('FSOC002255');
};
FreestylerConnector.prototype.send = function(msg){
	this.socket.write(CLEAR+msg);
};