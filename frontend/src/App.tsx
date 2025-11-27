import { Routes, Route } from "react-router-dom";
import { CreateForm } from "./CreateForm";
import { ReadView } from "./ReadView";
import { useEffect, useState, useRef } from "react";

function App() {
  const [showBoot, setShowBoot] = useState(true);
  const [bootText, setBootText] = useState("");
  const currentIndexRef = useRef(0);

  const asciiArt = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         ██████╗ ███████╗███╗   ██╗██████╗ ██████╗ ███████╗    ║
║        ██╔════╝██╔════╝████╗  ██║██╔══██╗██╔══██╗██╔════╝     ║
║        ██║     █████╗  ██╔██╗ ██║██║  ██║██████╔╝█████╗       ║
║        ██║     ██╔══╝  ██║╚██╗██║██║  ██║██╔══██╗██╔══╝       ║
║        ╚██████╗███████╗██║ ╚████║██████╔╝██║  ██║███████╗     ║
║         ╚═════╝╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝╚══════╝     ║
║                                                               ║
║         SECURE ENCRYPTED MESSAGE TRANSMISSION v2.0.1          ║
║                    [TERMINAL INTERFACE]                       ║
╚═══════════════════════════════════════════════════════════════╝`;

  const bootSequence = [
    "[SYSTEM] Initializing secure connection...",
    "[SYSTEM] Loading encryption modules...",
    "[SYSTEM] Establishing quantum tunnel...",
    "[SYSTEM] Verifying cryptographic protocols...",
    "[SYSTEM] System ready.",
    "[SYSTEM] Welcome to Cendre - Burn After Reading"
  ];

  useEffect(() => {
    if (showBoot) {
      currentIndexRef.current = 0;
      setBootText(""); // Reset boot text
      
      const interval = setInterval(() => {
        if (currentIndexRef.current < bootSequence.length) {
          const text = bootSequence[currentIndexRef.current];
          if (text) {
            setBootText(prev => prev + text + "\n");
          }
          currentIndexRef.current++;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowBoot(false), 500);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [showBoot]);

  if (showBoot) {
    return (
      <div className="min-h-screen bg-terminal-black flex items-center justify-center p-4 crt">
        <div className="matrix-bg"></div>
        <div className="max-w-3xl w-full relative z-10">
          <pre className="ascii-art text-xs sm:text-sm lg:text-base animate-pulse-glow">
            {asciiArt}
          </pre>
          <div className="mt-8 font-mono text-terminal-green text-sm terminal-text">
            <pre className="whitespace-pre-wrap">
              {bootText}
              <span className="cursor"></span>
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-terminal-black text-terminal-green font-mono crt terminal-text overflow-hidden">
      <div className="matrix-bg"></div>
      <div className="flex flex-col h-full relative z-10">
        {/* Terminal Header */}
        <header className="border-b border-terminal-green-dim bg-black/80 backdrop-blur flex-shrink-0">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-terminal-red animate-pulse"></div>
                  <div className="w-3 h-3 rounded-full bg-terminal-amber animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-3 h-3 rounded-full bg-terminal-green animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>
                <div className="text-terminal-green text-sm">
                  <span className="opacity-50">root@cendre:~#</span> <span className="animate-pulse">_</span>
                </div>
              </div>
              <div className="text-xs text-terminal-green">
                [SECURE] [ENCRYPTED] [NO-LOG]
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
            <div className="max-w-2xl w-full my-auto">
              <div className="terminal-border rounded-lg bg-black/90 backdrop-blur p-6 md:p-8">
                {/* Terminal Title Bar */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-terminal-green/30">
                  <div className="flex items-center space-x-2">
                    <span className="text-terminal-cyan text-lg">⬢</span>
                    <h1 className="text-xl font-bold text-terminal-green terminal-text">
                      CENDRE://SECURE_MESSAGE_SYSTEM
                    </h1>
                  </div>
                  <div className="text-xs text-terminal-green animate-flicker">
                    v2.0.1
                  </div>
                </div>

                {/* Terminal Info */}
                <div className="mb-6 text-xs text-terminal-green space-y-1">
                  <div className="terminal-prompt">Create and share one-time encrypted secrets</div>
                  <div className="terminal-prompt">End-to-end encryption with AES-256-GCM</div>
                  <div className="terminal-prompt">Messages self-destruct after reading</div>
                </div>

                {/* Routes */}
                <div className="relative">
                  <Routes>
                    <Route path="/" element={<CreateForm />} />
                    <Route path="/s/:id" element={<ReadView />} />
                  </Routes>
                </div>
              </div>

              {/* Terminal Footer */}
              <div className="mt-4 text-center text-xs text-terminal-green animate-pulse-glow">
                <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
                <div className="mt-2">[CONNECTION: SECURE] [PROTOCOL: TLS 1.3]</div>
              </div>
            </div>
          </div>
        </main>

        {/* System Status Bar */}
        <footer className="border-t border-terminal-green-dim bg-black/80 backdrop-blur flex-shrink-0">
          <div className="max-w-6xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between text-xs text-terminal-green">
              <div className="flex items-center gap-4">
                <span>MEM: <span className="text-terminal-green">42.7%</span></span>
                <span className="opacity-50">|</span>
                <span>CPU: <span className="text-terminal-green">12.3%</span></span>
                <span className="opacity-50">|</span>
                <span>NET: <span className="text-terminal-green">SECURE</span></span>
              </div>
              <div className="animate-pulse">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;