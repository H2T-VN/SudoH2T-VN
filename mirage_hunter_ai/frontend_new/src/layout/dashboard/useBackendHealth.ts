import { useEffect, useRef, useState } from "react";

import { getHealth, isMockEnabled } from "../../features/dashboard/services/api";

export type BackendHealth = "connecting" | "online" | "offline";

const HEALTH_INTERVAL_MS = 15_000;

export function useBackendHealth(): BackendHealth {
  const [health, setHealth] = useState<BackendHealth>("connecting");
  const lastHealth = useRef<BackendHealth>("connecting");

  useEffect(() => {
    let active = true;

    const checkHealth = async () => {
      if (active) {
        setHealth("connecting");
      }

      try {
        const result = await getHealth();

        if (active && result.ok && result.source === "api") {
          lastHealth.current = "online";
          setHealth("online");
        } else if (active) {
          if (!isMockEnabled && lastHealth.current !== "offline") {
            console.warn("[Mirage Hunter] Backend chưa phản hồi.");
          }
          lastHealth.current = "offline";
          setHealth("offline");
        }
      } catch {
        if (active) {
          if (!isMockEnabled && lastHealth.current !== "offline") {
            console.warn("[Mirage Hunter] Backend chưa phản hồi.");
          }
          lastHealth.current = "offline";
          setHealth("offline");
        }
      }
    };

    void checkHealth();
    const intervalId = window.setInterval(() => void checkHealth(), HEALTH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return health;
}
