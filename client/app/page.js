"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

let socket;

export default function Home() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    socket = io("http://localhost:3001");

    socket.on("session created", (sessionId) => {
      router.push(`/terminal/${sessionId}`);
    });
    socket.on("session joined", (sessionId) => {
      router.push(`/terminal/${sessionId}`);
    });

    socket.on("error", (msg) => {
      setError(msg);
    });
    return () => socket.disconnect();
  }, []);

  const createSession = () => {
    socket.emit("create session");
  };

  const joinSession = () => {
    if (!joinId.trim()) return;
    socket.emit("join session", joinId.trim());
  };
  return (
    <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center font-mono">
      <div className="flex flex-col items-center gap-8">
        {/* heading */}
        <div className="text-center">
          <h1 className="text-white text-2xl font-medium tracking-wide">
            collab-terminal
          </h1>
          <p className="text-[#333] text-sm mt-2">
            shared terminal sessions, in the browser
          </p>
        </div>

        {/* create button */}
        <button
          onClick={createSession}
          className="w-64 bg-[#1e3a2f] border border-[#2d6e53] text-[#4caf87] px-8 py-3 rounded-lg text-sm hover:bg-[#264d3d] transition-colors"
        >
          create new session
        </button>

        {/* join section */}
        <div className="flex flex-col gap-3 w-64">
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinSession()}
            placeholder="enter session id"
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#e0e0e0] placeholder-[#333] px-4 py-3 rounded-lg text-sm outline-none focus:border-[#2d6e53] transition-colors"
          />
          <button
            onClick={joinSession}
            className="w-64 bg-[#1a1a1a] border border-[#2a2a2a] text-[#666] px-8 py-3 rounded-lg text-sm hover:border-[#2d6e53] hover:text-[#4caf87] transition-colors"
          >
            join session
          </button>
          {error && (
            <p className="text-[#e05555] text-xs text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
