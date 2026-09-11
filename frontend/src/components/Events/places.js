const PIEDMONT = { lat: 35.6184, lng: -97.7514 };
const RADIUS_METERS = 25000;

function waitForMaps(timeoutMs = 8000) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.google?.maps) {
        clearInterval(timer);
        resolve(window.google.maps);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, 50);
  });
}

export async function loadPlacesLibrary() {
  const maps = await waitForMaps();
  if (!maps) return null;
  if (typeof maps.importLibrary === "function") {
    try {
      return await maps.importLibrary("places");
    } catch {
      return maps.places || null;
    }
  }
  return maps.places || null;
}

function mapLegacyPredictions(preds) {
  return (preds || []).map((item) => ({
    placeId: item.place_id,
    label: item.structured_formatting?.main_text || item.description,
    secondary: item.structured_formatting?.secondary_text || "",
    description: item.description,
  }));
}

function mapNewSuggestions(suggestions) {
  return (suggestions || [])
    .map((row) => row.placePrediction)
    .filter(Boolean)
    .map((prediction) => {
      const description = prediction.text?.text || prediction.mainText?.text || "";
      return {
        placeId: prediction.placeId,
        label: prediction.mainText?.text || description,
        secondary: prediction.secondaryText?.text || "",
        description,
      };
    })
    .filter((row) => row.placeId && row.description);
}

export async function fetchPlacePredictions(query, sessionToken) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const maps = await waitForMaps();
  const places = await loadPlacesLibrary();
  if (!maps || !places) return [];

  if (typeof places.AutocompleteSuggestion?.fetchAutocompleteSuggestions === "function") {
    try {
      const request = {
        input: q,
        includedRegionCodes: ["us"],
        locationBias: {
          north: 35.85,
          south: 35.38,
          east: -97.35,
          west: -97.95,
        },
      };
      if (sessionToken) request.sessionToken = sessionToken;
      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      const mapped = mapNewSuggestions(suggestions);
      if (mapped.length) return mapped;
    } catch {
      /* Legacy AutocompleteService still works if Places API (New) is off. */
    }
  }

  if (typeof places.AutocompleteService !== "function") return [];

  return new Promise((resolve) => {
    const service = new places.AutocompleteService();
    const request = {
      input: q,
      componentRestrictions: { country: "us" },
      location: new maps.LatLng(PIEDMONT.lat, PIEDMONT.lng),
      radius: RADIUS_METERS,
    };
    if (sessionToken) request.sessionToken = sessionToken;
    service.getPlacePredictions(request, (preds, status) => {
      if (status !== "OK" && status !== "ZERO_RESULTS") {
        resolve([]);
        return;
      }
      resolve(mapLegacyPredictions(preds));
    });
  });
}

export async function createSessionToken() {
  const places = await loadPlacesLibrary();
  if (typeof places?.AutocompleteSessionToken === "function") {
    return new places.AutocompleteSessionToken();
  }
  return null;
}
