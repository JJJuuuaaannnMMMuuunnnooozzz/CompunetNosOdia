class ChatDelegate {
    constructor() {
        this.communicator = null;
        this.serverProxy = null;
        this.adapter = null;
        this.myUsername = null;

        this.onIncomingCall = null;
        this.onCallAccepted  = null;
        this.onAudioRecieved = null;
        
        // Callbacks para llamadas grupales
        this.onIncomingGroupCall = null;
        this.onGroupCallAccepted = null;
        
        // Rastrear llamadas grupales activas: groupName -> Set de participantes
        this.activeGroupCalls = new Map();
    }

    async init(username) {
        this.myUsername = username;



        let targetIp = "localhost";
        try{
            const response = await fetch("./config.json");
            const config = await response.json();
            if(config.serverIp){
                targetIp = config.serverIp;
                console.log("Configuracion cargada desde config.json ", targetIp);
            }
        }catch (e){
            console.warn("No se cargo config.json, usando localhost")
        }

        this.communicator = Ice.initialize();
        const proxyStr = `ChatServer:ws -h ${targetIp} -p 9099`;

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

    //Este señor de aca es para los audios grupales
    async sendGroupVoiceNote(groupName, audioBytes) {
        if (!this.serverProxy) return;
        console.log(`Enviando nota de voz a grupo ${groupName}`);
        await this.serverProxy.sendGroupVoiceNote(this.myUsername, groupName, audioBytes);
    }

    // Métodos para llamadas grupales
    async callGroup(groupName) {
        if (!this.serverProxy) return;
        await this.serverProxy.initiateGroupCall(this.myUsername, groupName);
    }

    async answerGroupCall(groupName) {
        if (!this.serverProxy) return;
        await this.serverProxy.answerGroupCall(this.myUsername, groupName);
    }

    async sendGroupAudio(groupName, audioData) {
        console.log("Enviando audio grupal a", groupName, "bytes:", audioData?.length);
        await this.serverProxy.sendGroupAudio(this.myUsername, groupName, audioData);
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

    incomingGroupCall(groupName, caller, current) {
        console.log("Observer incomingGroupCall JS desde ICE:", groupName, "por", caller);
        if (this.delegate.onIncomingGroupCall) {
            this.delegate.onIncomingGroupCall(groupName, caller);
        } else {
            console.log("onIncomingGroupCall NO está configurado");
        }
    }

    groupCallAccepted(groupName, participant, current) {
        console.log("Observer groupCallAccepted JS:", groupName, "participante:", participant);
        if (this.delegate.onGroupCallAccepted) {
            this.delegate.onGroupCallAccepted(groupName, participant);
        } else {
            console.log("onGroupCallAccepted NO está configurado");
        }
    }
}

export default new ChatDelegate();
