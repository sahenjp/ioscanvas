import { useEffect } from 'react';
import { ExportPanel } from './components/ExportPanel';
import { Inspector } from './components/Inspector';
import { Palette } from './components/Palette';
import { PhoneCanvas } from './components/PhoneCanvas';
import { useEditorStore } from './store/editor';
import { TopBar } from './components/TopBar';
import './styles/app.css';

export default function App() {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const deleteSelectedNode = useEditorStore((state) => state.deleteSelectedNode);
  const duplicateSelectedNode = useEditorStore((state) => state.duplicateSelectedNode);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditing = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable);
      if (isEditing) return;

      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (modifier && event.key.toLowerCase() === 'd' && selectedNodeId) {
        event.preventDefault();
        duplicateSelectedNode();
        return;
      }

      if (selectedNodeId && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        deleteSelectedNode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedNode, duplicateSelectedNode, redo, selectedNodeId, undo]);

  return (
    <div className="app-shell">
      <TopBar />
      <div className="editor-grid">
        <Palette />
        <PhoneCanvas />
        <Inspector />
      </div>
      <ExportPanel />
    </div>
  );
}
