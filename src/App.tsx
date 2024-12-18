import "./App.css";
import { Index } from "./pages/PortedIndex";
import { Route, Routes } from "react-router-dom";
import { Navbar } from "./Navbar";

function App() {
  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/" element={<Index />}></Route>
        <Route path="/index.html" element={<Index />}></Route>
      </Routes>
    </div>
  );
}

export default App;
