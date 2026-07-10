import LogInteractionForm from "./components/LogInteractionForm";
import AIChatPanel from "./components/AIChatPanel";

export default function App() {
  return (
    <div className="app-shell">
      <div className="layout">
        <LogInteractionForm />
        <AIChatPanel />
      </div>
    </div>
  );
}
