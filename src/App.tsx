import { useEffect, useRef } from 'react';
import { ExportPanel } from './components/ExportPanel';
import { Inspector } from './components/Inspector';
import { Palette, PartsLibrary } from './components/Palette';
import { PhoneCanvas } from './components/PhoneCanvas';
import { useEditorStore } from './store/editor';
import { TopBar } from './components/TopBar';
import { readShareHash } from './lib/share';
import './styles/app.css';

export default function App() {
  const colorScheme = useEditorStore((state) => state.document.appearance.colorScheme);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectedNodeIds = useEditorStore((state) => state.selectedNodeIds);
  const selectNode = useEditorStore((state) => state.selectNode);
  const previewMode = useEditorStore((state) => state.previewMode);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);
  const deleteSelectedNode = useEditorStore((state) => state.deleteSelectedNode);
  const duplicateSelectedNode = useEditorStore((state) => state.duplicateSelectedNode);
  const copySelectedNode = useEditorStore((state) => state.copySelectedNode);
  const cutSelectedNode = useEditorStore((state) => state.cutSelectedNode);
  const pasteNode = useEditorStore((state) => state.pasteNode);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const moveSelectedNode = useEditorStore((state) => state.moveSelectedNode);
  const groupSelectedNodes = useEditorStore((state) => state.groupSelectedNodes);
  const ungroupSelectedNode = useEditorStore((state) => state.ungroupSelectedNode);
  const loadDocument = useEditorStore((state) => state.loadDocument);
  const shareHashHandled = useRef(false);

  useEffect(() => {
    if (shareHashHandled.current || !window.location.hash) return;
    shareHashHandled.current = true;
    const sharedDocument = readShareHash(window.location.hash);
    if (sharedDocument) loadDocument(sharedDocument);
  }, [loadDocument]);

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

      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const search = window.document.getElementById('parts-search');
        if (search instanceof HTMLInputElement) {
          search.focus();
          search.select();
        }
        return;
      }

      if (modifier && event.key.toLowerCase() === 'd' && selectedNodeId) {
        event.preventDefault();
        duplicateSelectedNode();
        return;
      }

      if (modifier && event.shiftKey && event.key.toLowerCase() === 'g' && selectedNodeId) {
        event.preventDefault();
        ungroupSelectedNode();
        return;
      }

      if (modifier && !event.shiftKey && event.key.toLowerCase() === 'g' && selectedNodeIds.length > 1) {
        event.preventDefault();
        groupSelectedNodes();
        return;
      }

      if (modifier && event.key.toLowerCase() === 'c' && selectedNodeId) {
        event.preventDefault();
        copySelectedNode();
        return;
      }

      if (modifier && event.key.toLowerCase() === 'x' && selectedNodeId) {
        event.preventDefault();
        cutSelectedNode();
        return;
      }

      if (modifier && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        pasteNode();
        return;
      }

      if (!modifier && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setPreviewMode(!previewMode);
        return;
      }

      if (selectedNodeIds.length > 0 && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        deleteSelectedNode();
        return;
      }

      if (event.key === 'Escape') {
        selectNode(null);
        return;
      }

      if (selectedNodeId && event.altKey && event.key === 'ArrowUp') {
        event.preventDefault();
        moveSelectedNode('up');
        return;
      }

      if (selectedNodeId && event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        moveSelectedNode('down');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelectedNode, cutSelectedNode, deleteSelectedNode, duplicateSelectedNode, groupSelectedNodes, moveSelectedNode, pasteNode, previewMode, redo, selectedNodeId, selectedNodeIds.length, selectNode, setPreviewMode, undo, ungroupSelectedNode]);

  return (
    <div className="app-shell" data-theme={colorScheme === 'system' ? undefined : colorScheme}>
      <TopBar />
      <div className={`editor-grid ${previewMode ? 'preview-grid' : ''}`}>
        {!previewMode && <Palette />}
        {!previewMode && <PartsLibrary />}
        <PhoneCanvas />
        {!previewMode && <Inspector />}
      </div>
      {!previewMode && <ExportPanel />}
    </div>
  );
}
