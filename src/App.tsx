import { DndContext } from '@dnd-kit/core';
import { ExportPanel } from './components/ExportPanel';
import { Inspector } from './components/Inspector';
import { Palette } from './components/Palette';
import { PhoneCanvas } from './components/PhoneCanvas';
import { TopBar } from './components/TopBar';
import './styles/app.css';

export default function App() {
  return (
    <DndContext>
      <div className="app-shell">
        <TopBar />
        <div className="editor-grid">
          <Palette />
          <PhoneCanvas />
          <Inspector />
        </div>
        <ExportPanel />
      </div>
    </DndContext>
  );
}
