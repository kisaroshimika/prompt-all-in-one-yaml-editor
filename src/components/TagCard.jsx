import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Edit3, Languages, Check, X, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

export function TagCard({ id, prompt, label, color, onUpdate, onDelete, onTranslate, path, existingPrompts = [] }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editPrompt, setEditPrompt] = useState(prompt);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 1,
    position: 'relative',
    cursor: path ? 'default' : 'initial',
  };

  const handleSave = () => {
    const trimmedPrompt = editPrompt.trim();
    if (!trimmedPrompt) {
      alert("プロンプト名は空にできません。");
      return;
    }
    if (existingPrompts.includes(trimmedPrompt)) {
      alert(`「${trimmedPrompt}」は同じグループ内に既に存在します。\nプロンプト名はグループ内で一意である必要があります。`);
      return;
    }
    
    onUpdate({ label: editLabel, prompt: trimmedPrompt });
    setEditPrompt(trimmedPrompt);
    setIsEditing(false);
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      onDoubleClick={() => {
        setEditLabel(label);
        setEditPrompt(prompt);
        setIsEditing(true);
      }}
      className={`glass tag-card group p-6 rounded-2xl border flex flex-col transition-colors ${isDragging ? 'is-dragging' : ''} ${isEditing ? 'border-indigo-400' : ''}`}
    >
      <div 
        className="absolute top-0 left-0 w-full h-1.5 rounded-t-2xl" 
        style={{ 
          backgroundColor: 'white',
          backgroundImage: `linear-gradient(${color}, ${color})`
        }}
      />
      
      <div className="flex-1 flex flex-col gap-4 relative">
        {isEditing ? (
          <div onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()} className="pointer-events-auto flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Prompt (EN)</label>
              <input 
                autoFocus
                value={editPrompt} 
                onChange={e => setEditPrompt(e.target.value)}
                className="w-full text-sm font-mono text-indigo-400 bg-white/5 border border-white/10 rounded-lg p-2"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Label (JA)</label>
              <input 
                value={editLabel} 
                onChange={e => setEditLabel(e.target.value)}
                className="w-full text-base text-white bg-white/5 border border-white/10 rounded-lg p-2"
              />
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 py-2 px-4 hover:bg-white/10 rounded-xl text-gray-400 transition-all">
                <X size={18} />
                キャンセル
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 py-2 px-4 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-white font-bold transition-all shadow-lg shadow-indigo-500/20">
                <Check size={18} />
                保存
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="pr-8">
              {path && (
                <div className="text-[10px] text-indigo-300 font-bold mb-2 bg-indigo-500/10 inline-block px-2 py-0.5 rounded-full border border-indigo-500/20">
                  {path}
                </div>
              )}
              <span className="text-xs font-mono text-gray-500 truncate block mb-1 opacity-70 group-hover:opacity-100 transition-opacity" title={prompt}>
                {prompt}
              </span>
              <h3 className="text-xl font-bold text-white leading-tight">{label}</h3>
            </div>
            
            <div onPointerDown={e => e.stopPropagation()} className="flex items-center gap-3 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto">
              <button 
                onClick={() => {
                  setEditLabel(label);
                  setEditPrompt(prompt);
                  setIsEditing(true);
                }}
                className="flex items-center gap-2 text-sm font-bold py-2 px-4 rounded-xl bg-white/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"
              >
                <Edit3 size={16} />
                編集
              </button>
              <button 
                onClick={onTranslate}
                className="flex items-center gap-2 text-sm font-bold py-2 px-4 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-all"
              >
                <Languages size={16} />
                翻訳
              </button>
              <button 
                onClick={onDelete}
                className="ml-auto p-2.5 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                title="削除"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </>
        )}
      </div>

      <div 
        className="absolute top-4 right-4 drag-handle text-gray-600 hover:text-white/80 transition-colors p-2 cursor-grab active:cursor-grabbing z-10"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </div>
    </motion.div>
  );
}
