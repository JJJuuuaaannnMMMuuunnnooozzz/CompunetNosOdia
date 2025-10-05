import javax.sound.sampled.*;

public class AudioPlayer {

    public static void playAudio(byte[] audioData) throws Exception {
        AudioFormat format = new AudioFormat(44100, 16, 1, true, true);
        DataLine.Info info = new DataLine.Info(SourceDataLine.class, format);
        SourceDataLine speaker = (SourceDataLine) AudioSystem.getLine(info);
        speaker.open(format);
        speaker.start();
        speaker.write(audioData, 0, audioData.length);
        speaker.drain();
        speaker.stop();
        speaker.close();
    }
}
