import React from 'react';
import {createRoot} from 'react-dom/client';
import AssemblyApp from './assembly-app';
import './site.css';
createRoot(document.getElementById('root')!).render(<AssemblyApp/>);
