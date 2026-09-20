import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import ChatbotWidget from "./components/common/ChatbotWidget";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ChatbotWidget />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
