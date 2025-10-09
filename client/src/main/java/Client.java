import java.io.*;
import java.net.*;
import java.util.Scanner;
import java.util.Base64;

public class Client {

    private static PrintWriter out;
    private static BufferedReader in;
    private static Socket socket;
    private static Scanner sc;

    public static void main(String[] args) throws Exception {

        String host = (args.length > 0) ? args[0] : "localhost";
        System.out.println(host);
        int port = (args.length > 1) ? Integer.parseInt(args[1]) : 9090;
        System.out.println(port);

        socket = new Socket(host, port);
        in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
        out = new PrintWriter(socket.getOutputStream(), true);
        sc = new Scanner(System.in);

        String serverMsg = in.readLine();
        System.out.println(serverMsg);

        String username = sc.nextLine();
        out.println(username);

        startReceiverThread();

        while (true) {
            showMenu();
            int op;
            try {
                op = Integer.parseInt(sc.nextLine());
            } catch (NumberFormatException e) {
                System.out.println("Opción inválida.");
                continue;
            }

            if (op == 9) {
                socket.close();
                break;
            }

            switch (op) {
                case 1 -> createGroup();
                case 2 -> addUserToGroup();
                case 3 -> sendMessageToUser();
                case 4 -> sendMessageToGroup();
                case 5 -> sendVoiceNoteToUser();
                case 6 -> sendVoiceNoteToGroup();
                case 7 -> doACall();
                case 8 -> doGroupCall();

                default -> System.out.println("Opción no implementada aún.");
            }
        }
    }

    private static void showMenu() {
        System.out.println("\n--- MENÚ ---");
        System.out.println("1. Crear grupo de chat");
        System.out.println("2. Añadir usuario a grupo");
        System.out.println("3. Enviar mensaje a usuario");
        System.out.println("4. Enviar mensaje a grupo");
        System.out.println("5. Enviar nota de voz a usuario");
        System.out.println("6. Enviar nota de voz a grupo");
        System.out.println("7. Realizar llamada a usuario");
        System.out.println("8. Realizar llamada a grupo");
        System.out.println("9. Salir");
        System.out.print("Elige opción: ");
    }

    private static void startReceiverThread() {
        new Thread(() -> {
            try {
                String resp;
                while ((resp = in.readLine()) != null) {
                    if (resp.startsWith("CALL_FROM")) {
                        handleIncomingCall(resp);
                    }else if (resp.startsWith("INCOMING_GROUP_CALL")) {
                        handleIncomingGroupCall(resp);
                    } else if (resp.startsWith("CALL_ACCEPTED")) {
                        handleCallAccepted(resp);
                    } else if (resp.startsWith("VOICE_FROM")) {
                        processVoiceNote(resp);
                    } else {
                        System.out.println(resp);
                    }

                }
            } catch (IOException e) {
                System.out.println("Conexión cerrada.");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private static void processVoiceNote(String resp) throws Exception {
        String[] parts = resp.split(" ", 3);
        if (parts.length >= 3) {
            String sender = parts[1];
            byte[] audio = Base64.getDecoder().decode(parts[2]);
            System.out.println("Nota de voz recibida de " + sender);
            AudioPlayer.playAudio(audio);
        }
    }

    private static void createGroup() {
        System.out.print("Nombre del grupo: ");
        String g = sc.nextLine();
        out.println("CREATE_GROUP " + g);
    }

    private static void addUserToGroup() {
        System.out.print("Grupo: ");
        String gname = sc.nextLine();
        System.out.print("Usuario a invitar: ");
        String userToAdd = sc.nextLine();
        out.println("ADD_TO_GROUP " + gname + " " + userToAdd);
    }

    private static void sendMessageToUser() {
        System.out.print("Usuario destino: ");
        String u = sc.nextLine();
        System.out.print("Mensaje: ");
        String mu = sc.nextLine();
        out.println("MSG_USER " + u + " " + mu);
    }

    private static void sendMessageToGroup() {
        System.out.print("Nombre del grupo: ");
        String gn = sc.nextLine();
        System.out.print("Mensaje: ");
        String mg = sc.nextLine();
        out.println("MSG_GROUP " + gn + " " + mg);
    }

    private static void sendVoiceNoteToUser() {
        try {
            System.out.print("Usuario destino: ");
            String audioUser = sc.nextLine();
            System.out.print("Duración (segundos): ");
            int dur = Integer.parseInt(sc.nextLine());
            System.out.println("Grabando...");

            byte[] audioData = AudioCapturer.captureAudio(dur);
            String base64 = Base64.getEncoder().encodeToString(audioData);
            out.println("VOICE_USER " + audioUser + " " + base64);
            System.out.println("Nota de voz enviada a " + audioUser);
        } catch (Exception e) {
            System.out.println("Error enviando nota de voz: " + e.getMessage());
        }
    }

    private static void sendVoiceNoteToGroup() {
        try {
            System.out.print("Nombre del grupo: ");
            String groupName = sc.nextLine();
            System.out.print("Duración (segundos): ");
            int durGroup = Integer.parseInt(sc.nextLine());
            System.out.println("Grabando...");

            byte[] audioGroup = AudioCapturer.captureAudio(durGroup);
            String base64Group = Base64.getEncoder().encodeToString(audioGroup);
            out.println("VOICE_GROUP " + groupName + " " + base64Group);
            System.out.println("Nota de voz enviada al grupo " + groupName);
        } catch (Exception e) {
            System.out.println("Error enviando nota de voz al grupo: " + e.getMessage());
        }
    }

    private static void doACall() {
        try {
            System.out.print("Usuario destino: ");
            String user = sc.nextLine();

            int listenPort = 8888;

            new Thread(() -> {
                try {
                    AudioCallCapturer.startReception(listenPort);
                } catch (Exception e) {
                    System.out.println("Error en recepción de audio: " + e.getMessage());
                }
            }).start();


            out.println("CALL_USER " + user + " " + listenPort);
            System.out.println("Llamando a " + user + " desde puerto " + listenPort + "...");
        } catch (Exception e) {
            System.out.println("Error iniciando llamada: " + e.getMessage());
        }
    }


    private static void handleIncomingCall(String msg) {
        try {
            String[] parts = msg.split(" ");
            String fromUser = parts[1];
            String ipA = parts[2]; // IP de A
            int portA = Integer.parseInt(parts[3]);

            int listenPortB = 8889;

            System.out.println("Llamada entrante de " + fromUser + " (" + ipA + ":" + portA + ")");

            new Thread(() -> {
                try {
                    AudioCallCapturer.startReception(listenPortB);
                } catch (Exception e) {
                    System.out.println("Error en recepción de audio: " + e.getMessage());
                }
            }).start();

            new Thread(() -> {
                try {
                    AudioCallSender.startCall(ipA, portA);
                } catch (Exception e) {
                    System.out.println("Error en envío de audio: " + e.getMessage());
                }
            }).start();

            sendAcceptCall(fromUser, listenPortB);

        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Error procesando llamada entrante: " + e.getMessage());
        }

    }


    private static void sendAcceptCall(String user, int port) {
        out.println("ACCEPT_CALL " + user + " " + port);
    }

    private static void handleCallAccepted(String msg) {
        try {
            String[] parts = msg.split(" ");
            String fromUser = parts[1];
            String ipB = parts[2];
            int portB = Integer.parseInt(parts[3]);

            System.out.println(fromUser + " aceptó la llamada. Conectando audio a " + ipB + ":" + portB + "...");

            new Thread(() -> {
                try {
                    AudioCallSender.startCall(ipB, portB);
                } catch (Exception e) {
                    System.out.println("Error en envío de audio a B: " + e.getMessage());
                }
            }).start();

        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Error procesando aceptación de llamada: " + e.getMessage());
        }
    }


    private static void doGroupCall() {
        try {
            System.out.print("Nombre del grupo: ");
            String group = sc.nextLine();
            out.println("CALL_GROUP " + group);
            System.out.println("Iniciando llamada grupal con " + group + "...");
        } catch (Exception e) {
            System.out.println("Error iniciando llamada grupal: " + e.getMessage());
        }
    }


    private static void handleIncomingGroupCall(String msg) {
        try {
            String[] parts = msg.split(" ");
            String groupName = parts[1];
            String serverIp = parts[2];
            int port = Integer.parseInt(parts[3]);

            System.out.println("Llamada grupal entrante en " + groupName);
            System.out.println("Conectando automáticamente...");

            new Thread(() -> {
                try {
                    AudioCallSender.startCall(serverIp, port);
                } catch (Exception e) {
                    System.out.println("Error enviando audio: " + e.getMessage());
                }
            }).start();

            new Thread(() -> {
                try {
                    AudioCallCapturer.startReception(port);
                } catch (Exception e) {
                    System.out.println("Error recibiendo audio: " + e.getMessage());
                }
            }).start();

        } catch (Exception e) {
            System.out.println("Error procesando llamada grupal: " + e.getMessage());
        }
    }






}
