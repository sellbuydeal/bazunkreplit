import { useState, useEffect } from 'react';

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const sceneKeys = Object.keys(durations);
    
    // @ts-ignore
    if (window.startRecording) window.startRecording();

    let timeout: NodeJS.Timeout;
    let isFirstPass = true;

    const advance = (index: number) => {
      if (index >= sceneKeys.length) {
        // @ts-ignore
        if (isFirstPass && window.stopRecording) window.stopRecording();
        isFirstPass = false;
        setCurrentScene(0);
        timeout = setTimeout(() => advance(1), durations[sceneKeys[0]]);
        return;
      }

      setCurrentScene(index);
      timeout = setTimeout(() => advance(index + 1), durations[sceneKeys[index]]);
    };

    timeout = setTimeout(() => advance(1), durations[sceneKeys[0]]);

    return () => clearTimeout(timeout);
  }, [JSON.stringify(durations)]);

  return { currentScene };
}
