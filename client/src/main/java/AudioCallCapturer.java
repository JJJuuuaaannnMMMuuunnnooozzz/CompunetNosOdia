import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.SourceDataLine;
import javax.sound.sampled.TargetDataLine;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;

public class AudioCallCapturer {

    private static boolean recieving = true;

    public static void startReception(int listeningPort) {
        recieving = true;

        try{
            AudioFormat format = new AudioFormat(44100, 16, 2, true, false);
            SourceDataLine speaker = AudioSystem.getSourceDataLine(format);
            speaker.open(format);
            speaker.start();

            DatagramSocket socket = new DatagramSocket(listeningPort);
            byte[] buffer = new byte[4096];

            while(recieving) {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                socket.receive(packet);
                speaker.write(packet.getData(), 0, packet.getLength());
            }

            speaker.stop();
            speaker.close();
            socket.close();
            System.out.println("Reception complete.");

        }catch (Exception e){
            System.err.println("Reception failed: " + e.getMessage());

        }
    }

    public static void stopReception() {
        recieving = false;
    }



}
