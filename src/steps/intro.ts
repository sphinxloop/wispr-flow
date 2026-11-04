import { CONFIG } from '../config';
import type { Step } from '../core/stateMachine';
import { isAbort } from '../core/util';

export const introStep: Step = {
  id: 'intro',
  enter(g) {
    const { screens, subtitles, effects } = g.ui;
    const v = screens.video;
    effects.clearBlack();
    screens.show('intro');
    if (!v.getAttribute('src')) v.src = CONFIG.paths.introVideo;
    v.currentTime = 0;
    v.muted = g.audio.muted;

    let done = false;
    const finish = async () => {
      if (done) return;
      done = true;
      subtitles.hide();
      try {
        await effects.fadeToBlack(CONFIG.timing.introFadeMs);
        g.state.fromBlack = true;
        g.goto('standby');
      } catch (e) {
        if (!isAbort(e)) console.error(e);
      }
    };
    v.onended = finish;
    v.onerror = finish;
    screens.soundHint.onclick = () => {
      v.muted = g.audio.muted;
      screens.soundHint.hidden = true;
    };

    const started = v.play();
    if (started) {
      started.catch(() => {
        // Autoplay with sound refused: retry muted and offer a tap.
        v.muted = true;
        screens.soundHint.hidden = g.audio.muted;
        v.play().catch(finish);
      });
    }

    const signal = g.signal;
    const tick = () => {
      if (done || signal.aborted) return;
      const t = v.currentTime;
      const cue = CONFIG.introCues.find((c) => t >= c.start && t < c.end);
      if (cue) subtitles.show(cue.text, 'survivor');
      else subtitles.hide();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
  exit(g) {
    const { screens, subtitles } = g.ui;
    screens.video.pause();
    screens.video.onended = null;
    screens.video.onerror = null;
    screens.soundHint.hidden = true;
    subtitles.hide();
  },
};
