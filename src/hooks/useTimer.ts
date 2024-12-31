import { useEffect, useRef, useState } from "react";

type Params = {
  onTimeout?: () => void;
  initialTime?: number;
  onChangeRemainingTime?: (seconds: number) => void;
};

export function useTimer({
  initialTime,
  onTimeout = () => {},
  onChangeRemainingTime,
}: Params = {}) {
  const timeoutCallback = useRef<() => void>(() => {});
  timeoutCallback.current = onTimeout;

  const [remainSeconds, setRemainSeconds] = useState(initialTime ?? 0);

  const timeoutIdRef = useRef(0);
  const intervalIdRef = useRef(0);

  const isRunning = useRef(false);

  // 4.3 초가 흐른 후 일시정지 한다면, 다시 시작했을때 +1 초가 되는건 0.7 초가 흐른 뒤 이다.
  // 해당 시간을 계산하기 위한 ref
  const timestampAfterLastOneSecond = useRef(0); // 마지막 1초가 흐른 시점의 timestamp
  const elapsedTimeAfterOneSecond = useRef(0); // 1초가 흐른 후의 ms(여기서는 0.7초)

  const start = (seconds?: number) => {
    if (isRunning.current) return;

    if (typeof seconds === "number" && seconds > 0) {
      setRemainSeconds(seconds);
    }

    const SECONDS = 1000;
    const remainedTimeToNextSecond =
      SECONDS - elapsedTimeAfterOneSecond.current;

    timestampAfterLastOneSecond.current = Date.now();

    isRunning.current = true;
    const elapseSeconds = async () => {
      const now = Date.now();
      const elapsed = (now - timestampAfterLastOneSecond.current) / 1000;

      elapsedTimeAfterOneSecond.current = 0;
      timestampAfterLastOneSecond.current = now;

      const getOutRemainSecond = Promise.withResolvers<number>();

      setRemainSeconds((t) => {
        const nextTick = t - elapsed;

        if (nextTick <= 0) {
          stop();
          timeoutCallback.current?.();
          getOutRemainSecond.resolve(0);
          return 0;
        }

        getOutRemainSecond.resolve(nextTick);
        return nextTick;
      });

      return getOutRemainSecond.promise;
    };

    // 다음 시간까지 남은 ms 를 계산해 타이머 시작
    timeoutIdRef.current = window.setTimeout(async () => {
      const remainSec = await elapseSeconds();

      if (remainSec > 1) {
        intervalIdRef.current = window.setInterval(() => {
          elapseSeconds();
        }, SECONDS);
      }
    }, remainedTimeToNextSecond);
  };

  const clearWebApiTimers = () => {
    clearInterval(intervalIdRef.current);
    clearTimeout(timeoutIdRef.current);
    isRunning.current = false;
  };

  const pause = () => {
    if (!isRunning.current) return;

    elapsedTimeAfterOneSecond.current +=
      Date.now() - timestampAfterLastOneSecond.current;
    clearWebApiTimers();
  };

  const stop = () => {
    elapsedTimeAfterOneSecond.current = 0;
    timestampAfterLastOneSecond.current = 0;
    setRemainSeconds(0);
    clearWebApiTimers();
  };

  useEffect(() => {
    return () => {
      clearWebApiTimers();
    };
  }, []);

  useEffect(() => {
    onChangeRemainingTime?.(remainSeconds);
  }, [remainSeconds]);

  return {
    remainSeconds: Math.ceil(remainSeconds),
    start,
    pause,
    stop,
  };
}
