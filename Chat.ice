module Demo {
    sequence<byte> AudioData;

    interface ChatClient {
        void incomingCall(string fromUser);
        void callAccepted(string fromUser);
        void callRejected(string fromUser);
        void receiveAudio(AudioData data);

        //notas de voz
        void receiveVoiceNote(string fromUser, AudioData data);
    }

    interface ChatServer {
        // El cliente se registra para recibir eventos
        void register(string username, ChatClient* client);

        // Señalización de llamadas
        void initiateCall(string fromUser, string toUser);
        void answerCall(string fromUser, string toUser);
        void rejectCall(string fromUser, string toUser);

        // Envío de audio (Streaming) - llamadas
        void sendAudio(string fromUser, string toUser, AudioData data);

        //nnotas de voz
        void sendVoiceNote(string fromUser, string toUser, AudioData data);

        //notas de voz grupales
        void sendGroupVoiceNote(string fromUser, string groupName, AudioData data);
    }
}
