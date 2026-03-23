import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

// use Haversine formula to calculate distance between two points on sphere given long and lat
function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;     // convert coords to radians for use

  const R = 6371000; // earth radius in meters
  const dLat = toRad(lat2 - lat1);          // detla lat
  const dLon = toRad(lon2 - lon1);          // delta lon

  // compute value from half angle trig identity 
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +         // sin^2 * change in lat / 2
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *   // cos(lat1) * cos(lat2)
    Math.sin(dLon / 2) * Math.sin(dLon / 2);          // sin^2 * changes in long / 2

  // calculate angular distance between the two points
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // convert angular dist to km
  return R * c;
}

export function useLocation() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [locations, setLocations] = useState<Location.LocationObject[]>([]);
  const [distance, setDistance] = useState(0); // meters

  const watchRef = useRef<Location.LocationSubscription | null>(null);

  // Request permission once
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const startTracking = async (resetRun = false): Promise<boolean> => {
    if (!hasPermission) {
      Alert.alert(
        "Location permission required",
        "Please enable location permissions in your device settings."
      );
      return false;
    }

    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }

    if (resetRun) {
      setLocations([]);
      setDistance(0);
    }

    setIsTracking(true);

    // accuracy thresehold for fixes reduces random jumping caused by noise 
    const max_accuracy_meters = 15;

    // minimum distance to move before add distance 
    const min_dist_register = 4;

    // watch users location
    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,

        // update every 1.5s
        timeInterval: 1500,
        // update after moving 5 meters
        distanceInterval: 5,
      },
      (location) => {
        setLocations((prev) => {
          const accuracy = location.coords.accuracy ?? Number.POSITIVE_INFINITY;

          // skip noisy points if accuracy isnt met
          if (accuracy > max_accuracy_meters) {
            return prev;
          }

          // if theres a valid previous point get distance to it
          if (prev.length > 0) {
            const last = prev[prev.length - 1];

            // dist between last valid fix and current fix
            const newDistance = getDistanceFromLatLonInMeters(
              last.coords.latitude,
              last.coords.longitude,
              location.coords.latitude,
              location.coords.longitude
            );

            // dont count movement below min dist register or fix accuracy radius
            const minDistanceToCount = Math.max(min_dist_register, accuracy);
            if (newDistance < minDistanceToCount) {
              return prev;
            }

            // distance accumulation
            setDistance((prevDistance) => prevDistance + newDistance);
          }
          return [...prev, location];
        });
      }
    );

    return true;
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
      }
    };
  }, []);

  return {
    hasPermission,
    isTracking,
    locations,
    distance,
    startTracking,
    stopTracking,
  };
}
