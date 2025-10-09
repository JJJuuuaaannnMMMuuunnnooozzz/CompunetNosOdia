import java.io.IOException;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

public class GroupCallServer implements Runnable {
    private int port;
    private String groupName;
    private Set<String> members;
    private Map<String, InetSocketAddress> activeClients = new ConcurrentHashMap<>();
    private boolean running = true;
    private DatagramSocket socket;

    public GroupCallServer(String groupName, Set<String> members, int port) {
        this.groupName = groupName;
        this.members = members;
        this.port = port;
    }

    @Override
    public void run() {
        try {
            socket = new DatagramSocket(port);
            System.out.println("Servidor de llamada grupal para " + groupName + " en puerto " + port);

            byte[] buffer = new byte[4096];

            while (running) {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                socket.receive(packet);

                activeClients.putIfAbsent(packet.getAddress().getHostAddress() + ":" + packet.getPort(),
                        new InetSocketAddress(packet.getAddress(), packet.getPort()));

                for (InetSocketAddress addr : activeClients.values()) {
                    System.out.println("deede   " + addr + " \n");
                    if (!addr.equals(new InetSocketAddress(packet.getAddress(), packet.getPort()))) {
                        DatagramPacket outPacket = new DatagramPacket(packet.getData(), packet.getLength(), addr);
                        socket.send(outPacket);
                    }
                }
            }
        } catch (Exception e) {
            System.out.println("Error en servidor de llamada grupal: " + e.getMessage());
        } finally {
            if (socket != null && !socket.isClosed()) {
                socket.close();
            }
        }
    }


    public void stop() {
        running = false;
    }


    public void removeParticipant(String username) {
        if (members != null) {
            members.remove(username);
            System.out.println("Usuario " + username + " salió de la llamada grupal.");
        }
    }

    public Set<String> getParticipants() {
        return members;
    }

    public void stopServer() {
        running = false;
        if (socket != null && !socket.isClosed()) {
            socket.close();
        }
        System.out.println("Servidor de llamada grupal detenido.");
    }

}
