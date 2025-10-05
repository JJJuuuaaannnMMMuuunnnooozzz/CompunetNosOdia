import java.io.*;
import java.net.*;
import java.util.Scanner;
import java.util.Base64;

public class Client {
    public static void main(String[] args) throws Exception {
        String host = (args.length > 0) ? args[0] : "localhost";
        int port = (args.length > 1) ? Integer.parseInt(args[1]) : 9090;

        Socket socket = new Socket(host, port);
        BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
        PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
        Scanner sc = new Scanner(System.in);

        String serverMsg = in.readLine();
        System.out.println(serverMsg);

        String username = sc.nextLine();
        out.println(username);

        new Thread(() -> {
            try {
                String resp;
                while ((resp = in.readLine()) != null) {
                    if (resp.startsWith("VOICE_FROM")) {
                        // VOICE_FROM <usuario> <base64>
                        String[] parts = resp.split(" ", 3);
                        if (parts.length >= 3) {
                            String sender = parts[1];
                            byte[] audio = java.util.Base64.getDecoder().decode(parts[2]);
                            System.out.println("Nota de voz recibida de " + sender);
                            AudioPlayer.playAudio(audio);
                        }
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
        while (true) {
            System.out.println("\n--- MENÚ ---");
            System.out.println("1. Crear grupo de chat");
            System.out.println("2. Añadir usuario a grupo");
            System.out.println("3. Enviar mensaje a usuario");
            System.out.println("4. Enviar mensaje a grupo");
            System.out.println("5. Enviar nota de voz a usuario");
            System.out.println("6. Enviar nota de voz a grupo");
            System.out.println("7. Realizar llamada (no implementado)");
            System.out.println("8. Salir");
            System.out.print("Elige opción: ");

            int op;
            try {
                op = Integer.parseInt(sc.nextLine());
            } catch (NumberFormatException e) {
                System.out.println("Opción inválida.");
                continue;
            }

            if (op == 8) {
                socket.close();
                break;
            }

            switch (op) {
                case 1:
                    System.out.print("Nombre del grupo: ");
                    String g = sc.nextLine();
                    out.println("CREATE_GROUP " + g);
                    break;
                case 2:
                    System.out.print("Grupo: ");
                    String gname = sc.nextLine();
                    System.out.print("Usuario a invitar: ");
                    String userToAdd = sc.nextLine();
                    out.println("ADD_TO_GROUP " + gname + " " + userToAdd);
                    break;
                case 3:
                    System.out.print("Usuario destino: ");
                    String u = sc.nextLine();
                    System.out.print("Mensaje: ");
                    String mu = sc.nextLine();
                    out.println("MSG_USER " + u + " " + mu);
                    break;
                case 4:
                    System.out.print("Nombre del grupo: ");
                    String gn = sc.nextLine();
                    System.out.print("Mensaje: ");
                    String mg = sc.nextLine();
                    out.println("MSG_GROUP " + gn + " " + mg);
                    break;
                case 5:
                    System.out.print("Usuario destino: ");
                    String audioUser = sc.nextLine();
                    System.out.print("Duración (segundos): ");
                    int dur = Integer.parseInt(sc.nextLine());
                    System.out.println("Grabando...");

                    byte[] audioData = AudioCapturer.captureAudio(dur);
                    String base64 = Base64.getEncoder().encodeToString(audioData);
                    out.println("VOICE_USER " + audioUser + " " + base64);
                    System.out.println("Nota de voz enviada a " + audioUser);
                    break;
                case 6:
                    System.out.print("Nombre del grupo: ");
                    String groupName = sc.nextLine();
                    System.out.print("Duración (segundos): ");
                    int durGroup = Integer.parseInt(sc.nextLine());
                    System.out.println("Grabando...");

                    byte[] audioGroup = AudioCapturer.captureAudio(durGroup);
                    String base64Group = java.util.Base64.getEncoder().encodeToString(audioGroup);
                    out.println("VOICE_GROUP " + groupName + " " + base64Group);
                    System.out.println("Nota de voz enviada al grupo " + groupName);
                    break;
                default:
                    System.out.println("Opción no implementada aún.");
            }
        }

    }

}
