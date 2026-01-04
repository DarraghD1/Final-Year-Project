import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

// use Haversine formula to get users distance between two latitude and longitude points
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

  // implementation of Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

  const startTracking = async (): Promise<boolean> => {
    if (!hasPermission) {
      Alert.alert(
        "Location permission required",
        "Please enable location permissions in your device settings."
      );
      return false;
    }

    // reset run data
    setLocations([]);
    setDistance(0);
    setIsTracking(true);

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (location) => {
        setLocations((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const newDistance = getDistanceFromLatLonInMeters(
              last.coords.latitude,
              last.coords.longitude,
              location.coords.latitude,
              location.coords.longitude
            );
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
