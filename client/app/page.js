'use client';
import {  useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

let socket;

export default function Home() {
  const router = useRouter();
  const [joinId, setJoinId] = useState('');
  const [error, setError] = useState('');
  return (
    <div>
      <div>
        <div>
          <h1>Collab-terminal</h1>
          <p>shared temrinal sessions</p>
        </div>

        <button>Create new session</button>

        <div>
          <input placeholder="enter session id" />
          <button>Join session</button>
          
        </div>
      </div>
    </div>
  );
}
