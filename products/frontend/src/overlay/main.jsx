import React from 'react';
import ReactDOM from 'react-dom/client';
import Overlay from './Overlay.jsx';

const channel = new URLSearchParams(window.location.search).get('channel') || 'mychannel';

ReactDOM.createRoot(document.getElementById('root')).render(<Overlay channel={channel} />);

