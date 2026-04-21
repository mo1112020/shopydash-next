export class SoundService {
  private static audio: HTMLAudioElement | null = null;
  private static isMuted: boolean = false;
  private static hasInteracted: boolean = false;

  private static SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"; // Ding sound

  static init() {
    if (typeof window !== "undefined") {
      this.isMuted = localStorage.getItem("abo_hommos_mute") === "true";
      this.audio = new Audio(this.SOUND_URL);
      this.audio.load();
    }
  }

  static toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem("abo_hommos_mute", String(this.isMuted));
    return this.isMuted;
  }

  static getMuteStatus() {
    return this.isMuted;
  }

  static async enableAudio() {
    this.hasInteracted = true;
    if (this.audio) {
      try {
        // Play and immediately pause to unlock audio on iOS/Android
        await this.audio.play();
        this.audio.pause();
        this.audio.currentTime = 0;
        return true;
      } catch (e) {
        console.error("Audio enable failed:", e);
        return false;
      }
    }
    return false;
  }

  static async playNewOrderSound() {
    if (!this.audio || this.isMuted) return;

    try {
      this.audio.currentTime = 0;
      await this.audio.play();
    } catch (error) {
      console.warn("Could not play sound - user interaction might be needed", error);
    }
  }
  static async resumeAudioContext() {
    return this.enableAudio();
  }

  static cleanup() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }
}

// Initialize on import
SoundService.init();
