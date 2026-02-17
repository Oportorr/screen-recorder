'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SimpleAuth({ currentUser }: { currentUser: string | null }) {
  const [username, setUsername] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim()) return;
    await fetch('/api/fake-login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    router.refresh();
  };

  const handleLogout = async () => {
    await fetch('/api/fake-login', { method: 'DELETE' });
    router.refresh();
  };

  if (currentUser) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-slate-400 text-sm">Logged in as {currentUser}</span>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"
        >
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter any username"
        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
      />
      <button
        onClick={handleLogin}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
      >
        Log In
      </button>
    </div>
  );
}