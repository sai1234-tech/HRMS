import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import ChatbotWidget from "./components/common/ChatbotWidget";

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      <AppRoutes />
      {user && <ChatbotWidget />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

