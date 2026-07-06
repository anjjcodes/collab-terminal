"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";

let socket;

export default function TerminalPage() {
  const { sessionId } = useParams();
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState(1);

  useEffect(() => {
    const initTerminal = async () => {
      const { Terminal } = await import('xterm');
      await import('xterm/css/xterm.css');
    
      const term = new Terminal({
        cursorBlink: true,
        cols: 100,
        rows: 30,
        theme: {
          background: '#0e0e0e',
          foreground: '#e0e0e0',
          cursor: '#4caf87',
          selectionBackground: '#2d6e5366',
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.5,
      });
    
      term.open(terminalRef.current);
      term.focus();
      xtermRef.current = term;
    
      socket = io('http://localhost:3001');
    
      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join session', sessionId);
      });
    
      socket.on('terminal output', (data) => {
        term.write(data);
      });
    
      socket.on('user count', (count) => {
        setUsers(count);
      });
    
      term.onData((data) => {
        socket.emit('terminal input', data);
      });
    };
    initTerminal();

    return () => {
      socket?.disconnect();
      xtermRef.current?.dispose();
    };
  }, [sessionId]);

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex font-mono">
      {/* sidebar */}
      <div className="w-48 bg-[#0b0b0b] border-r border-[#1e1e1e] flex flex-col p-4 gap-4">
        <div>
          <p className="text-[#333] text-xs mb-3 tracking-widest">SESSION</p>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
            <p className="text-[#e0e0e0] text-xs">{sessionId}</p>
            <button
              onClick={copySessionId}
              className="text-[#2d6e53] text-xs mt-2 hover:text-[#4caf87] transition-colors"
            >
              copy to share
            </button>
          </div>
        </div>

        <div>
          <p className="text-[#333] text-xs mb-3 tracking-widest">ONLINE</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#4caf87]"></div>
            <p className="text-[#4caf87] text-xs">{users} active</p>
          </div>
        </div>

        <div className="mt-auto">
          <div
            className={`flex items-center gap-2 text-xs ${connected ? "text-[#4caf87]" : "text-[#e05555]"}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${connected ? "bg-[#4caf87]" : "bg-[#e05555]"}`}
            ></div>
            {connected ? "connected" : "connecting..."}
          </div>
        </div>
      </div>

      {/* terminal area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-[#1a1a1a] px-4 py-2 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff453a]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffd60a]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#30d158]"></div>
          <span className="text-[#333] text-xs ml-2">bash</span>
          <span className="ml-auto text-xs text-[#2d6e53] bg-[#1e3a2f] px-3 py-1 rounded-full">
            ● live
          </span>
        </div>
        <div ref={terminalRef} className="flex-1 p-3" />
      </div>
    </div>
  );
}
