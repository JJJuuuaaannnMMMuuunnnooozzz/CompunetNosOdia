import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.LineUnavailableException;
import javax.sound.sampled.TargetDataLine;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;

public class AudioCallSender {

    public static boolean sending = true;
    public static void startCall(String destinationIp, int destinationPort) {
        sending = true;
        try{
            AudioFormat format = new AudioFormat(44100, 16, 2, true, false);
            TargetDataLine microphone = AudioSystem.getTargetDataLine(format);
            microphone.open(format);
            microphone.start();

            DatagramSocket socket = new DatagramSocket();
            byte[] buffer = new byte[4096];

            System.out.println("Sending audio call to " + destinationIp + ":" + destinationPort);

            while (sending) {
                int bytesRead = microphone.read(buffer, 0, buffer.length);
                DatagramPacket packet = new DatagramPacket(buffer, bytesRead, InetAddress.getByName(destinationIp),
                        destinationPort);
                socket.send(packet);
            }

            microphone.stop();
            microphone.close();
            socket.close();
            System.out.println("Call ended");

        } catch (Exception e) {
            System.err.println("Error while sending audio call to " + destinationIp + ":" + destinationPort + ": "
                    + e.getMessage());


        }
    }

    public static void stopCall() {
        sending = false;
    }
}