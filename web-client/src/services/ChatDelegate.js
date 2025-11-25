class ChatDelegate {
    constructor() {
        this.communicator = null;
        this.serverProxy = null;
        this.adapter = null;
        this.myUsername = null;

        this.onIncomingCall = null;
        this.onCallAccepted  = null;
        this.onAudioRecieved = null;
    }

    async init(username) {
        this.myUsername = username;
        this.communicator = Ice.initialize();

        const hostname = window.location.hostname || "localhost";
        const proxyStr = `ChatServer:ws -h ${hostname} -p 9099`;
        const baseProxy = this.communicator.stringToProxy(proxyStr);
        this.serverProxy = await Demo.ChatServerPrx.checkedCast(baseProxy);

        // 1) Crear adapter
        this.adapter = await this.communicator.createObjectAdapter("");
        console.log("Adapter creado:", this.adapter);

        // 2) Obtener y asociar la conexión (IMPORTANTE: await)
        const con = await this.serverProxy.ice_getConnection();
        console.log("Conexión ICE obtenida (real):", con);
        con.setAdapter(this.adapter);
        console.log("Adapter asociado a la conexión");

        // 3) Crear servant y registrar
        console.log("Antes de instanciar ChatObserver");
        const myObserver = new ChatObserver(this);
        console.log("Después de instanciar ChatObserver");
        const myProxy = await this.adapter.addWithUUID(myObserver);

        const clientPrx = Demo.ChatClientPrx.uncheckedCast(myProxy);
        console.log("Antes de register");
        await this.serverProxy.register(username, clientPrx);
        console.log("Después de register");

        // 4) Activar adapter
        await this.adapter.activate();
        console.log(`Conectado a ICE como ${username}`);
    }

    async callUser(targetUser) {
        if (!this.serverProxy) return;
        await this.serverProxy.initiateCall(this.myUsername, targetUser);
    }

    async answerCall(callerUser) {
        await this.serverProxy.answerCall(this.myUsername, callerUser);
    }

    async sendAudioChunck(targetUser, audioData) {
        console.log("Enviando audio a", targetUser, "bytes:", audioData?.length);
        await this.serverProxy.sendAudio(this.myUsername, targetUser, audioData);
    }

    //Este ya es para audios

    async sendVoiceNote(targetUser, audioBytes) {
        if (!this.serverProxy) {
            console.error("No conectado al servidor ICE");
            return;
        }
        console.log("Enviando archivo de audio a", targetUser, "bytes:", audioBytes?.length);

        // Llama al método del servidor
        await this.serverProxy.sendVoiceNote(this.myUsername, targetUser, audioBytes);
    }
}

class ChatObserver extends Demo.ChatClient {
    constructor(delegate) {
        super();
        console.log("ChatObserver INSTANCIADO", delegate);
        this.delegate = delegate;
    }

    incomingCall(fromUser, current) {
        console.log("Observer incomingCall JS desde ICE:", fromUser);
        if (this.delegate.onIncomingCall) {
            console.log("Ejecutando callback onIncomingCall");
            this.delegate.onIncomingCall(fromUser);
        } else {
            console.log("onIncomingCall NO está configurado");
        }
    }

    callAccepted(fromUser, current) {
        console.log("Observer callAccepted JS:", fromUser);
        if (this.delegate.onCallAccepted) {
            console.log("Si la aceptó")
            this.delegate.onCallAccepted(fromUser);
        }else{
            console.log("no aceptó :(")
        }
    }

    receiveAudio(data, current) {
        console.log("Observer receiveAudio JS, bytes:", data?.length);
        if (this.delegate.onAudioRecieved) {
            this.delegate.onAudioRecieved(data);
        }
    }


    receiveVoiceNote(fromUser, audioData, current) {
        console.log(`Nota de voz recibida de ${fromUser}: ${audioData.length} bytes`);
        if (this.delegate.onVoiceNoteReceived) {
            // Pasamos los bytes crudos a la UI
            this.delegate.onVoiceNoteReceived(fromUser, audioData);
        }
    }
}

export default new ChatDelegate();
