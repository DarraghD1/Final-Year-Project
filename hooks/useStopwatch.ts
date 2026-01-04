import { useEffect, useRef, useState } from "react";

type RunStatus = 'idle' | 'running' | 'paused'

export function useStopwatch() {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);


  // function to start stopwatch
  const start = () => {
    if (timerRef.current) return;           // already running
    setIsRunning(true);
    setStatus('running')

    // record time in second intervals
    timerRef.current = setInterval(() => {
      setSeconds((t) => t + 1);
    }, 1000);
  };

  // func to stop stopwatch
  const stop = () => {
    setIsRunning(false);
    setStatus('idle')

    // clear interval when stopped
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const pause = () => {
    stop();
    setStatus('paused')
  };

  const unpause = () => {
    start();
    setStatus('running')
  };

  const reset = () => {
    setSeconds(0);
    setStatus('idle')
  };

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    seconds,
    isRunning,
    status,
    start,
    pause,
    unpause,
    stop,
    reset,
  };
}
