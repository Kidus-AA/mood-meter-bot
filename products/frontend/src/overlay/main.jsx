import React from 'react';
import ReactDOM from 'react-dom/client';
import OverlayApp from './OverlayApp.jsx';
import '../styles/index.css';

const channel =
  new URLSearchParams(window.location.search).get('channel') || 'mychannel';

ReactDOM.createRoot(document.getElementById('root')).render(<OverlayApp />);
