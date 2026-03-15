import { useState } from "react";
import axios from "axios";
import ChatInterface from "./components/ChatInterface";
import CropHealthInterface from "./components/CropHealthInterface";
import HarvestInterface from "./components/HarvestInterface";
import SellingInterface from "./components/SellingInterface";
import SchemesInterface from "./components/SchemesInterface";
import AuthInterface from "./components/AuthInterface";
import SubscriptionInterface from "./components/SubscriptionInterface";
import CropPredictionInterface from "./components/CropPredictionInterface";
import { regionOptions } from "./data/options";

const API_BASE_URL = "/api/recommend-crop";

const defaultFormState = {
  state: "Andhra Pradesh",
  district: "West Godavari",
  farmAddress: "",
  latitude: null,
  longitude: null,
  landArea: 5,
  budget: 50000,
  labour: "medium",
  previousCrop: "",
};

function App() {
  // Auth state
  const [token, setToken] = useState(() => localStorage.getItem("cropsphere_token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cropsphere_user")); } catch { return null; }
  });

  function handleLogin(newToken, newUser) {
    localStorage.setItem("cropsphere_token", newToken);
    localStorage.setItem("cropsphere_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function handleLogout() {
    localStorage.removeItem("cropsphere_token");
    localStorage.removeItem("cropsphere_user");
    setToken(null);
    setUser(null);
  }

  const [formState, setFormState] = useState(defaultFormState);
  const [districts, setDistricts] = useState(regionOptions);
  
  // Phase 1 State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // App Phase State
  const [currentPhase, setCurrentPhase] = useState("planning");

  // Phase 2 State
  const [phase2Loading, setPhase2Loading] = useState(false);
  const [phase2Error, setPhase2Error] = useState("");
  const [phase2Result, setPhase2Result] = useState(null);
  const [phase2Sessions, setPhase2Sessions] = useState([]);
  const [phase2SidebarOpen, setPhase2SidebarOpen] = useState(false);

  const [harvestLoading, setHarvestLoading] = useState(false);
  const [harvestError, setHarvestError] = useState("");
  const [harvestResult, setHarvestResult] = useState(null);
  const [harvestSessions, setHarvestSessions] = useState([]);
  const [harvestSidebarOpen, setHarvestSidebarOpen] = useState(false);

  const [sellingLoading, setSellingLoading] = useState(false);
  const [sellingError, setSellingError] = useState("");
  const [sellingResult, setSellingResult] = useState(null);
  const [sellingSessions, setSellingSessions] = useState([]);
  const [sellingSidebarOpen, setSellingSidebarOpen] = useState(false);

  // Phase 5 State
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionSidebarOpen, setPredictionSidebarOpen] = useState(false);

  function updateField(field, value) {
    setFormState((current) => {
      if (field === "locationSelection") {
        return {
          ...current,
          farmAddress: value.address || current.farmAddress,
          latitude:
            typeof value.latitude === "number" ? value.latitude : current.latitude,
          longitude:
            typeof value.longitude === "number" ? value.longitude : current.longitude,
          state: value.state || current.state,
          district:
            value.state && value.district
              ? value.district
              : value.state
                ? (districts[value.state] || [])[0] || current.district
                : value.district || current.district,
        };
      }

      if (field === "state") {
        return { ...current, state: value, district: (districts[value] || [])[0] || "" };
      }
      return { ...current, [field]: value };
    });
  }

  async function handleSubmit() {
    setLoading(true);
    setErrorMessage("");
    setResult(null);
    setActiveFilter(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/farm-input`, formState);
      const data = response.data;
      setResult(data);

      // Save to session history
      const session = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        state: formState.state,
        district: formState.district,
        topCrop: data.top_crops?.[0]?.crop || "N/A",
        score: data.top_crops?.[0]?.suitability_score || 0,
        result: data,
        formState: { ...formState },
      };
      setSessions((prev) => [session, ...prev]);
    } catch (error) {
      const nextMessage =
        error.response?.data?.error ||
        "Unable to reach the recommendation API. Ensure the backend is running on port 5000.";
      setErrorMessage(nextMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSession(session) {
    setResult(session.result);
    setFormState(session.formState);
    setActiveFilter(null);
    setSidebarOpen(false);
  }

  async function handlePhase2Submit(data) {
    setPhase2Loading(true);
    setPhase2Error("");
    setPhase2Result(null);

    try {
      const formData = new FormData();
      if (data.files.report) formData.append("report", data.files.report);
      Object.keys(data.files.photos || {}).forEach(k => formData.append(`photo_${k}`, data.files.photos[k]));
      formData.append("answers", JSON.stringify(data.answers));

      const selectedImage =
        data.files.photos?.leaf ||
        data.files.photos?.field ||
        Object.values(data.files.photos || {}).find(Boolean);

      const healthResponse = await axios.post("/api/crop-health/analyze", formData);
      let diseaseResponse = null;

      if (selectedImage) {
        const diseaseFormData = new FormData();
        diseaseFormData.append("image", selectedImage);

        try {
          diseaseResponse = await axios.post("/api/detect-disease", diseaseFormData);
        } catch (_error) {
          diseaseResponse = {
            data: {
              plant: "Unavailable",
              health_status: "Unavailable",
              disease_name: null,
              confidence: 0,
              vision_labels: [],
              treatment: "Image disease detection is unavailable until the backend API keys are configured.",
              warning: "Plant.id or Google Vision is not configured on the backend.",
            },
          };
        }
      }

      const mergedResult = {
        ...healthResponse.data,
        diseaseDetection: diseaseResponse?.data || null,
      };

      setPhase2Result(mergedResult);

      const session = {
        id: Date.now(),
        date: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        stage: data.answers.stage || "Analysis",
        result: mergedResult
      };
      setPhase2Sessions(prev => [session, ...prev]);

    } catch (error) {
      setPhase2Error(error.response?.data?.error || "Unable to analyze crop health. Please check your connection.");
    } finally {
      setPhase2Loading(false);
    }
  }

  function handleSelectPhase2Session(session) {
    setPhase2Result(session.result);
    setPhase2SidebarOpen(false);
  }

  async function handleHarvestSubmit(data) {
    setHarvestLoading(true);
    setHarvestError("");
    setHarvestResult(null);

    try {
      const formData = new FormData();
      if (data.files.report) formData.append("report", data.files.report);
      Object.keys(data.files.photos || {}).forEach((key) => formData.append(`photo_${key}`, data.files.photos[key]));
      formData.append("answers", JSON.stringify(data.answers));

      const response = await axios.post("/api/harvest/analyze", formData);
      setHarvestResult(response.data);

      const session = {
        id: Date.now(),
        date: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        stage: response.data.summary?.maturityStage || response.data.cards?.harvestReadiness?.verdict || "Harvest analysis",
        result: response.data,
      };
      setHarvestSessions((prev) => [session, ...prev]);
    } catch (error) {
      setHarvestError(error.response?.data?.error || "Unable to analyze harvest readiness. Please check your connection.");
    } finally {
      setHarvestLoading(false);
    }
  }

  function handleSelectHarvestSession(session) {
    setHarvestResult(session.result);
    setHarvestSidebarOpen(false);
  }

  async function handleSellingSubmit(data) {
    setSellingLoading(true);
    setSellingError("");
    setSellingResult(null);

    try {
      const formData = new FormData();
      Object.keys(data.files.photos || {}).forEach((key) => formData.append(`photo_${key}`, data.files.photos[key]));
      formData.append("answers", JSON.stringify(data.answers));

      const response = await axios.post("/api/selling/analyze", formData);
      setSellingResult(response.data);

      const session = {
        id: Date.now(),
        date: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        crop: response.data.summary?.cropType || "Selling analysis",
        readiness: response.data.cards?.saleReadiness?.rating || "Review",
        result: response.data,
      };
      setSellingSessions((prev) => [session, ...prev]);
    } catch (error) {
      setSellingError(error.response?.data?.error || "Unable to analyze selling conditions. Please check your connection.");
    } finally {
      setSellingLoading(false);
    }
  }

  function handleSelectSellingSession(session) {
    setSellingResult(session.result);
    setSellingSidebarOpen(false);
  }

  async function handleRunPrediction(params) {
    if (!params) {
      setPrediction(null);
      return;
    }
    setPredictionLoading(true);
    try {
      const response = await axios.post("/api/crop-prediction", params);
      setPrediction(response.data);
    } catch (error) {
      console.error("Prediction failed", error);
    } finally {
      setPredictionLoading(false);
    }
  }

  // If not logged in, show auth screen
  if (!token) {
    return <AuthInterface onLogin={handleLogin} />;
  }

  if (currentPhase === "health") {
    return (
      <CropHealthInterface
        currentPhase={currentPhase}
        onPhaseChange={setCurrentPhase}
        sessions={phase2Sessions}
        onSelectSession={handleSelectPhase2Session}
        sidebarOpen={phase2SidebarOpen}
        onToggleSidebar={() => setPhase2SidebarOpen(!phase2SidebarOpen)}
        onSubmit={handlePhase2Submit}
        loading={phase2Loading}
        errorMessage={phase2Error}
        result={phase2Result}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  if (currentPhase === "harvesting") {
    return (
      <HarvestInterface
        currentPhase={currentPhase}
        onPhaseChange={setCurrentPhase}
        sessions={harvestSessions}
        onSelectSession={handleSelectHarvestSession}
        sidebarOpen={harvestSidebarOpen}
        onToggleSidebar={() => setHarvestSidebarOpen(!harvestSidebarOpen)}
        onSubmit={handleHarvestSubmit}
        loading={harvestLoading}
        errorMessage={harvestError}
        result={harvestResult}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  if (currentPhase === "selling") {
    return (
      <SellingInterface
        currentPhase={currentPhase}
        onPhaseChange={setCurrentPhase}
        sessions={sellingSessions}
        onSelectSession={handleSelectSellingSession}
        sidebarOpen={sellingSidebarOpen}
        onToggleSidebar={() => setSellingSidebarOpen(!sellingSidebarOpen)}
        onSubmit={handleSellingSubmit}
        loading={sellingLoading}
        errorMessage={sellingError}
        result={sellingResult}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  if (currentPhase === "schemes") {
    return (
      <SchemesInterface
        currentPhase={currentPhase}
        onPhaseChange={setCurrentPhase}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  if (currentPhase === "subscription") {
    return (
      <SubscriptionInterface
        currentPhase={currentPhase}
        onPhaseChange={setCurrentPhase}
        sidebarOpen={sellingSidebarOpen}
        onToggleSidebar={() => setSellingSidebarOpen(!sellingSidebarOpen)}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  if (currentPhase === "prediction") {
    return (
      <CropPredictionInterface
        currentPhase={currentPhase}
        onPhaseChange={setCurrentPhase}
        sidebarOpen={predictionSidebarOpen}
        onToggleSidebar={() => setPredictionSidebarOpen(!predictionSidebarOpen)}
        prediction={prediction}
        loading={predictionLoading}
        onRunPrediction={handleRunPrediction}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <ChatInterface
      currentPhase={currentPhase}
      onPhaseChange={setCurrentPhase}
      formState={formState}
      districts={districts}
      onFieldChange={updateField}
      onSubmit={handleSubmit}
      loading={loading}
      errorMessage={errorMessage}
      result={result}
      sessions={sessions}
      onSelectSession={handleSelectSession}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      user={user}
      onLogout={handleLogout}
    />
  );
}

export default App;
