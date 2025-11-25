let mediaRecorder;
let audioChunks = [];

export async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.start();
        return true;
    } catch (e) {
        console.error("Error micrófono:", e);
        return false;
    }
}

export function stopRecording() {
    return new Promise(resolve => {
        if (!mediaRecorder) return resolve(new Uint8Array(0));

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const arrayBuffer = await audioBlob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            // Limpiar tracks
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
            resolve(bytes);
        };

        mediaRecorder.stop();
    });
}
