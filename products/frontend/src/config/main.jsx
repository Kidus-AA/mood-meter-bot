import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/index.css';

function ConfigPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 gap-4">
      <h1 className="text-xl font-bold">Sentiment Snapshot – Config</h1>
      <p className="text-sm opacity-75 max-w-sm text-center">
        No configuration options are required for this demo extension.
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ConfigPage />);
