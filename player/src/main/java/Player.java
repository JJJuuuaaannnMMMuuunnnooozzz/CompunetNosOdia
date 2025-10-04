import java.net.DatagramPacket;
import java.net.DatagramSocket;

import javax.sound.sampled.AudioFormat;

public class Player {
    public static void main(String[] args)throws Exception {
        AudioFormat format =  new AudioFormat(44100, 16, 1, true, true);
        int port = Integer.parseInt(args[0]);
        PlayerThread thread = new PlayerThread(format);
        thread.start();
        thread.setPlay(true);

        DatagramSocket socket = new DatagramSocket(port);
        
        
        while (true) {
            byte[] data = new byte[1024];
            DatagramPacket packet = new DatagramPacket(data, data.length);
            
            socket.receive(packet);
            thread.play(data);
        }
    }
}
