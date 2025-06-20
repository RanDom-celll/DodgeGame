import React from "react";
import GameCanvas from "./components/GameCanvas";

function App() {
  return (
    <div className="flex overflow-x-hidden overflow-y-hidden bg-black backdrop-blur-sm justify-center">
      <GameCanvas />
    </div>
  );
}

export default App;
