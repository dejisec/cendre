import { Routes, Route } from "react-router-dom";
import { CreateForm } from "./CreateForm";
import { ReadView } from "./ReadView";

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="max-w-xl w-full px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Cendre
          </h1>
          <p className="text-slate-300 text-sm">
            Create and share one-time, end-to-end encrypted secrets.
          </p>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<CreateForm />} />
            <Route path="/s/:id" element={<ReadView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;


