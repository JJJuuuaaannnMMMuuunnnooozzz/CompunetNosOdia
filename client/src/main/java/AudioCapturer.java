import javax.sound.sampled.*;
import java.io.ByteArrayOutputStream;

public class AudioCapturer {

    public static byte[] captureAudio(int seconds) throws Exception {
        AudioFormat format = new AudioFormat(44100, 16, 1, true, true);
        DataLine.Info info = new DataLine.Info(TargetDataLine.class, format);
        TargetDataLine mic = (TargetDataLine) AudioSystem.getLine(info);
        mic.open(format);
        mic.start();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        long end = System.currentTimeMillis() + seconds * 1000;

        while (System.currentTimeMillis() < end) {
            int count = mic.read(buffer, 0, buffer.length);
            if (count > 0) {
                out.write(buffer, 0, count);
            }
        }

        mic.stop();
        mic.close();
        return out.toByteArray();
    }
}
