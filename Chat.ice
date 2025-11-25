module Demo {
    sequence<byte> AudioData;

    interface ChatClient {
        void incomingCall(string fromUser);
        void callAccepted(string fromUser);
        void callRejected(string fromUser);
        void receiveAudio(AudioData data);
        
        // Llamadas grupales
        void incomingGroupCall(string groupName, string caller);
        void groupCallAccepted(string groupName, string participant);
    }

    interface ChatServer {
        // El cliente se registra para recibir eventos
        void register(string username, ChatClient* client);

        // Señalización de llamadas individuales
        void initiateCall(string fromUser, string toUser);
        void answerCall(string fromUser, string toUser);
        void rejectCall(string fromUser, string toUser);

        // Envío de audio individual (Streaming)
        void sendAudio(string fromUser, string toUser, AudioData data);
        
        // Señalización de llamadas grupales
        void initiateGroupCall(string fromUser, string groupName);
        void answerGroupCall(string fromUser, string groupName);
        
        // Envío de audio grupal (Streaming)
        void sendGroupAudio(string fromUser, string groupName, AudioData data);
    }
}
