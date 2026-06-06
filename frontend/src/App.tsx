import { Routes, Route } from "react-router-dom";
import { CreateForm } from "./CreateForm";
import { ReadView } from "./ReadView";
import { NotFound } from "./NotFound";
import { Shell } from "./ui/Shell";

function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<CreateForm />} />
        <Route path="/s/:id" element={<ReadView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}

export default App;
